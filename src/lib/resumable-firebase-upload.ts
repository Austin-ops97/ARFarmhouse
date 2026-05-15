import type { StorageReference } from "firebase/storage";
import { uploadBytesResumable } from "firebase/storage";

import { uploadLog } from "@/lib/upload-log";

/** Hard ceiling — slow networks + large albums should still finish or hit stall watchdog first. */
const ABSOLUTE_MAX_MS = 50 * 60 * 1000;

/** No byte progress while state is `running` → cancel as stuck (Firebase retries transient errors internally). */
const DEFAULT_STALL_MS = 95_000;

function cancelUploadTask(task: { cancel?: () => boolean }) {
  try {
    task.cancel?.();
  } catch {
    /* noop */
  }
}

/**
 * Firebase resumable upload with stall detection, abort support, listener teardown,
 * and conservative deadlines so promises never hang indefinitely.
 */
export async function runFirebaseResumableUpload(
  objectRef: StorageReference,
  data: Blob,
  opts?: {
    contentType?: string;
    signal?: AbortSignal;
    onProgress?: (percent: number) => void;
    /** Identifies row in logs (path used when omitted). */
    label?: string;
    stallMs?: number;
  }
): Promise<void> {
  const label = opts?.label ?? objectRef.fullPath;
  const stallMs = opts?.stallMs ?? DEFAULT_STALL_MS;

  if (opts?.signal?.aborted) {
    throw new DOMException("Upload cancelled.", "AbortError");
  }

  uploadLog("uploading", { label, bytes: data.size });

  const metadata = opts?.contentType ? { contentType: opts.contentType } : undefined;
  const task = uploadBytesResumable(objectRef, data, metadata);

  let lastBytes = -1;
  let lastProgressAt = Date.now();
  let lastLoggedPct = -10;

  let unsubscribe: (() => void) | undefined;
  /** Browser timer ids — `@types/node` makes `ReturnType<typeof setTimeout>` a `Timeout`, but `window.*` uses numbers. */
  let stallInterval: number | undefined;
  let deadlineTimer: number | undefined;

  const cleanupTimers = () => {
    if (stallInterval !== undefined) {
      window.clearInterval(stallInterval);
      stallInterval = undefined;
    }
    if (deadlineTimer !== undefined) {
      window.clearTimeout(deadlineTimer);
      deadlineTimer = undefined;
    }
  };

  const abortListener = () => {
    uploadLog("cancelled", { label });
    cancelUploadTask(task);
  };
  opts?.signal?.addEventListener("abort", abortListener);

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        cleanupTimers();
        fn();
      };

      deadlineTimer = window.setTimeout(() => {
        uploadLog("deadline_exceeded", { label });
        cancelUploadTask(task);
        settle(() =>
          reject(
            new Error(
              "Upload timed out. Try again when you have a stronger connection or fewer photos at once."
            )
          )
        );
      }, ABSOLUTE_MAX_MS);

      stallInterval = window.setInterval(() => {
        const snap = task.snapshot;
        if (!snap || snap.state !== "running") return;
        if (snap.totalBytes > 0 && snap.bytesTransferred >= snap.totalBytes) return;

        const idleMs = Date.now() - lastProgressAt;
        if (idleMs >= stallMs && snap.bytesTransferred === lastBytes && lastBytes >= 0) {
          uploadLog("stalled", { label, idleMs, bytesTransferred: snap.bytesTransferred });
          cancelUploadTask(task);
          settle(() =>
            reject(new Error("Upload stalled. Check your connection and try again."))
          );
        }
      }, 12_000);

      unsubscribe = task.on(
        "state_changed",
        (snap) => {
          if (snap.bytesTransferred !== lastBytes) {
            lastBytes = snap.bytesTransferred;
            lastProgressAt = Date.now();
          }

          if (snap.totalBytes > 0 && opts?.onProgress) {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            opts.onProgress(pct);
            if (pct - lastLoggedPct >= 10 || pct === 100) {
              uploadLog("progress", {
                label,
                pct,
                bytesTransferred: snap.bytesTransferred,
                totalBytes: snap.totalBytes,
              });
              lastLoggedPct = pct;
            }
          }
        },
        (err) => {
          settle(() => {
            uploadLog("failed", { label, message: err instanceof Error ? err.message : String(err) });
            reject(err);
          });
        },
        () => {
          settle(() => {
            uploadLog("complete", { label });
            resolve();
          });
        }
      );
    });
  } finally {
    cleanupTimers();
    try {
      unsubscribe?.();
    } catch {
      /* noop */
    }
    opts?.signal?.removeEventListener("abort", abortListener);
  }
}
