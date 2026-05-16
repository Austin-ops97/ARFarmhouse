import type { StorageReference } from "firebase/storage";
import { uploadBytes, uploadBytesResumable } from "firebase/storage";

import type { BrowserIntervalId, BrowserTimeoutId } from "@/lib/browser-timer";
import { safariUploadLog, shouldUseSimpleIOSWebKitUpload } from "@/lib/ios-webkit-upload-transport";
import { isMobileUploadHost, mobileUploadLog } from "@/lib/mobile-upload-debug";
import { uploadFinalizeTrace, uploadLog, uploadStage } from "@/lib/upload-log";
import type { UploadTrace } from "@/lib/upload-trace";

/** Hard ceiling — slow networks + large albums should still finish or hit stall watchdog first. */
const ABSOLUTE_MAX_MS = 50 * 60 * 1000;

/** No byte progress while state is `running` → cancel as stuck (Firebase retries transient errors internally). */
const DEFAULT_STALL_MS = 135_000;

/** Cellular Safari often pauses byte snapshots longer without being a dead upload. */
const MOBILE_STALL_MS = 210_000;

/** iOS Safari + cold tunnels can legitimately spend a long time at 0 bytes before first chunk — avoids false stalls. */
const ZERO_BYTE_GRACE_MS = 75_000;

function stallBudgetMs(override?: number): number {
  if (override !== undefined) return override;
  return isMobileUploadHost() ? MOBILE_STALL_MS : DEFAULT_STALL_MS;
}

function cancelUploadTask(task: { cancel?: () => boolean }) {
  try {
    task.cancel?.();
  } catch {
    /* noop */
  }
}

/** `uploadBytes` has no snapshot API — creep progress so the UI never freezes mid-upload (e.g. ~52% on iOS). */
function startSyntheticUploadProgress(onProgress?: (percent: number) => void): () => void {
  if (!onProgress) return () => {};
  let pct = 6;
  onProgress(6);
  const id = window.setInterval(() => {
    if (pct >= 88) return;
    const room = 88 - pct;
    const step = Math.max(1, Math.min(room, Math.round(1 + Math.random() * 6)));
    pct = Math.min(88, pct + step);
    onProgress(pct);
  }, 400);
  return () => window.clearInterval(id);
}

function wrapUploadWithAbort<T>(signal: AbortSignal | undefined, promise: Promise<T>): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new DOMException("Upload cancelled.", "AbortError"));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Upload cancelled.", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener("abort", onAbort);
        reject(e);
      }
    );
  });
}

function wrapUploadWithDeadline<T>(label: string, promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => {
      uploadLog("deadline_exceeded", { label, cause: "absolute_max_ms", maxMs: ABSOLUTE_MAX_MS });
      reject(
        new Error(
          "Upload timed out. Try again when you have a stronger connection or fewer photos at once."
        )
      );
    }, ABSOLUTE_MAX_MS);
    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * Single-shot Storage upload for iOS WebKit — avoids resumable chunk streams that often stall mid-progress.
 * Progress is synthetic; the real work is one `uploadBytes` promise.
 */
async function runFirebaseUploadBytesSimple(
  objectRef: StorageReference,
  data: Blob,
  opts?: {
    contentType?: string;
    signal?: AbortSignal;
    onProgress?: (percent: number) => void;
    label?: string;
    trace?: UploadTrace;
  }
): Promise<void> {
  const label = opts?.label ?? objectRef.fullPath;
  const metadata = opts?.contentType ? { contentType: opts.contentType } : undefined;

  safariUploadLog("using uploadBytes fallback", { label, bytes: data.size });
  mobileUploadLog("iOS WebKit — uploadBytes transport (non-resumable)", { label, bytes: data.size });
  uploadStage("upload task — uploadBytes (iOS WebKit)", { label });
  opts?.trace?.("storage: uploadBytes (iOS WebKit)", { label, bytes: data.size });

  if (opts?.signal?.aborted) {
    throw new DOMException("Upload cancelled.", "AbortError");
  }

  const stopSynthetic = startSyntheticUploadProgress(opts?.onProgress);

  safariUploadLog("upload start", { label, bytes: data.size });
  uploadStage("upload bytes in flight (uploadBytes)", { label });

  try {
    uploadFinalizeTrace("upload promise created (uploadBytes)", { label, bytes: data.size });
    const uploadPromise = uploadBytes(objectRef, data, metadata);
    const wrapped = wrapUploadWithAbort(opts?.signal, uploadPromise);
    await wrapUploadWithDeadline(label, wrapped);
    uploadFinalizeTrace("upload promise resolved", { label, transport: "uploadBytes" });
  } finally {
    stopSynthetic();
  }

  uploadFinalizeTrace("upload bytes complete", { label, transport: "uploadBytes" });
  opts?.onProgress?.(100);
  safariUploadLog("upload complete", { label });
  uploadStage("finalize success — Storage bytes complete (uploadBytes)", { label });
  uploadLog("complete", { label, transport: "uploadBytes" });
  opts?.trace?.("storage: upload complete (uploadBytes)", { label });
  mobileUploadLog("storage upload bytes complete — uploadBytes", { label });
}

/**
 * Firebase resumable upload with stall detection, abort support, listener teardown,
 * and conservative deadlines so promises never hang indefinitely.
 *
 * On iPhone / iPad / iOS WebKit browsers, uses {@link uploadBytes} instead of {@link uploadBytesResumable}
 * for transport stability.
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
    /** Correlation / timing (same {@link UploadTrace} as feed/album finalize). */
    trace?: UploadTrace;
  }
): Promise<void> {
  const label = opts?.label ?? objectRef.fullPath;
  const stallMs = stallBudgetMs(opts?.stallMs);
  const trace = opts?.trace;

  if (typeof window === "undefined") {
    throw new Error("Firebase resumable uploads must run in a browser environment.");
  }

  if (opts?.signal?.aborted) {
    throw new DOMException("Upload cancelled.", "AbortError");
  }

  if (shouldUseSimpleIOSWebKitUpload()) {
    await runFirebaseUploadBytesSimple(objectRef, data, opts);
    return;
  }

  uploadStage("upload blob ready", {
    label,
    bytes: data.size,
    type: opts?.contentType ?? data.type,
  });
  trace?.("storage: blob ready", { label, bytes: data.size });
  mobileUploadLog("upload blob ready — Firebase task starting", {
    label,
    bytes: data.size,
    stallMs,
  });

  const metadata = opts?.contentType ? { contentType: opts.contentType } : undefined;
  uploadStage("upload task created", { label });
  trace?.("storage: Firebase task created", { label });
  const task = uploadBytesResumable(objectRef, data, metadata);
  const uploadStartedAt = Date.now();

  let lastBytes = -1;
  let lastProgressAt = Date.now();
  let lastLoggedPct = -10;

  let unsubscribe: (() => void) | undefined;
  let stallInterval: BrowserIntervalId | undefined;
  let deadlineTimer: BrowserTimeoutId | undefined;
  let loggedUploadRunning = false;
  let seededPctZero = false;
  let indeterminateNudgeSent = false;

  const bumpProgressClock = () => {
    lastProgressAt = Date.now();
  };

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

  const onVisibilityChange = () => {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "visible") {
      bumpProgressClock();
      mobileUploadLog("tab visible — refreshed upload stall clock", { label });
    } else {
      mobileUploadLog("tab hidden — stall watchdog paused", { label });
    }
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

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
        uploadLog("deadline_exceeded", { label, cause: "absolute_max_ms", maxMs: ABSOLUTE_MAX_MS });
        trace?.("storage: deadline exceeded — cancelling", {
          label,
          cause: "absolute_max_ms",
          maxMs: ABSOLUTE_MAX_MS,
        });
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
        if (typeof document !== "undefined" && document.visibilityState !== "visible") {
          return;
        }
        const snap = task.snapshot;
        if (!snap || snap.state !== "running") return;
        const finishDenom =
          snap.totalBytes > 0 ? snap.totalBytes : data.size > 0 ? data.size : snap.bytesTransferred;
        if (finishDenom > 0 && snap.bytesTransferred >= finishDenom) return;

        const zeroByteWarmup =
          snap.bytesTransferred === 0 && Date.now() - uploadStartedAt < ZERO_BYTE_GRACE_MS;
        if (zeroByteWarmup && lastBytes <= 0) return;

        const idleMs = Date.now() - lastProgressAt;
        if (idleMs >= stallMs && snap.bytesTransferred === lastBytes && lastBytes >= 0) {
          uploadStage("stalled during upload bytes — no snapshot progress", {
            label,
            idleMs,
            stallMs,
            bytesTransferred: snap.bytesTransferred,
            totalBytes: snap.totalBytes,
            blobBytes: data.size,
            inferredTotal: finishDenom,
            state: snap.state,
            cause: "no_byte_progress_while_running",
          });
          uploadLog("stalled", { label, idleMs, stallMs, bytesTransferred: snap.bytesTransferred });
          trace?.("storage: stalled — cancelling", {
            label,
            idleMs,
            stallMs,
            bytesTransferred: snap.bytesTransferred,
            cause: "no_byte_progress_while_running",
          });
          mobileUploadLog("upload stalled — cancelling task", {
            label,
            idleMs,
            stallMs,
            bytesTransferred: snap.bytesTransferred,
          });
          cancelUploadTask(task);
          settle(() =>
            reject(new Error("Upload stalled. Check your connection and try again."))
          );
        }
      }, 15_000);

      unsubscribe = task.on(
        "state_changed",
        (snap) => {
          const progressDenom =
            snap.totalBytes > 0 ? snap.totalBytes : data.size > 0 ? data.size : 0;

          if (snap.state === "running" && !loggedUploadRunning) {
            loggedUploadRunning = true;
            uploadStage("upload started (state_running)", {
              label,
              firebaseTotalBytes: snap.totalBytes,
              blobBytes: data.size,
              progressDenom,
            });
            trace?.("storage: running (first snapshot)", {
              label,
              firebaseTotalBytes: snap.totalBytes,
              blobBytes: data.size,
            });
          }

          if (snap.state === "running" && opts?.onProgress && !seededPctZero) {
            seededPctZero = true;
            opts.onProgress(0);
          }

          if (snap.bytesTransferred !== lastBytes) {
            lastBytes = snap.bytesTransferred;
            lastProgressAt = Date.now();
          }

          if (progressDenom > 0 && opts?.onProgress) {
            const pct = Math.min(100, Math.round((snap.bytesTransferred / progressDenom) * 100));
            opts.onProgress(pct);
            if (pct - lastLoggedPct >= 10 || pct === 100) {
              uploadLog("progress", {
                label,
                pct,
                bytesTransferred: snap.bytesTransferred,
                totalBytesFirebase: snap.totalBytes,
                progressDenomUsed: progressDenom,
              });
              lastLoggedPct = pct;
            }
          } else if (
            snap.bytesTransferred > 0 &&
            progressDenom <= 0 &&
            opts?.onProgress &&
            !indeterminateNudgeSent
          ) {
            indeterminateNudgeSent = true;
            opts.onProgress(8);
          }
        },
        (err) => {
          settle(() => {
            uploadLog("failed", { label, message: err instanceof Error ? err.message : String(err) });
            trace?.("storage: firebase error", {
              label,
              message: err instanceof Error ? err.message : String(err),
            });
            reject(err);
          });
        },
        () => {
          settle(() => {
            uploadFinalizeTrace("upload bytes complete", { label, transport: "resumable" });
            opts?.onProgress?.(100);
            uploadFinalizeTrace("upload promise resolved", { label, transport: "resumable" });
            uploadStage("finalize success — Storage bytes complete", { label });
            uploadLog("complete", { label });
            trace?.("storage: upload complete", { label });
            mobileUploadLog("storage upload bytes complete — listener success callback", { label });
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
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  }
}
