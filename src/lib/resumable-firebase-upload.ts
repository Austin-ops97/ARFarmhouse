import type { StorageReference } from "firebase/storage";
import { uploadBytesResumable } from "firebase/storage";

import type { BrowserIntervalId, BrowserTimeoutId } from "@/lib/browser-timer";
import { uploadLog, uploadStage } from "@/lib/upload-log";

/** Hard ceiling — slow networks + large albums should still finish or hit stall watchdog first. */
const ABSOLUTE_MAX_MS = 50 * 60 * 1000;

/** No byte progress while state is `running` → cancel as stuck (Firebase retries transient errors internally). */
const DEFAULT_STALL_MS = 135_000;

/** iOS Safari + cold tunnels can legitimately spend a long time at 0 bytes before first chunk — avoids false stalls. */
const ZERO_BYTE_GRACE_MS = 75_000;

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

  if (typeof window === "undefined") {
    throw new Error("Firebase resumable uploads must run in a browser environment.");
  }

  if (opts?.signal?.aborted) {
    throw new DOMException("Upload cancelled.", "AbortError");
  }

  uploadStage("upload blob ready", {
    label,
    bytes: data.size,
    type: opts?.contentType ?? data.type,
  });

  const metadata = opts?.contentType ? { contentType: opts.contentType } : undefined;
  uploadStage("upload task created", { label });
  const task = uploadBytesResumable(objectRef, data, metadata);
  const uploadStartedAt = Date.now();

  let lastBytes = -1;
  let lastProgressAt = Date.now();
  let lastLoggedPct = -10;

  let unsubscribe: (() => void) | undefined;
  let stallInterval: BrowserIntervalId | undefined;
  let deadlineTimer: BrowserTimeoutId | undefined;
  let loggedUploadRunning = false;

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

        const zeroByteWarmup =
          snap.bytesTransferred === 0 && Date.now() - uploadStartedAt < ZERO_BYTE_GRACE_MS;
        if (zeroByteWarmup && lastBytes <= 0) return;

        const idleMs = Date.now() - lastProgressAt;
        if (idleMs >= stallMs && snap.bytesTransferred === lastBytes && lastBytes >= 0) {
          uploadStage("stalled during upload bytes — no snapshot progress", {
            label,
            idleMs,
            bytesTransferred: snap.bytesTransferred,
            totalBytes: snap.totalBytes,
            state: snap.state,
          });
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
          if (snap.state === "running" && !loggedUploadRunning) {
            loggedUploadRunning = true;
            uploadStage("upload started", { label, totalBytes: snap.totalBytes });
          }
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
            uploadStage("finalize success — Storage bytes complete", { label });
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
