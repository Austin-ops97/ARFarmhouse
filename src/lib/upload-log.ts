/**
 * Structured upload tracing — enable in prod via `localStorage.setItem('ar_upload_debug','1')`.
 *
 * Prefer {@link import("@/lib/upload-trace")} `startUploadTrace()` for correlated runs; detail objects
 * may include `segment: 'cpu' | 'storage' | 'firestore' | 'meta'` for pipeline grouping.
 */

export function isUploadDebugEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage?.getItem("ar_upload_debug") === "1";
  } catch {
    return false;
  }
}

const ts = () => new Date().toISOString();

/** Logs `[upload] <iso> message` plus optional structured detail (enable with `ar_upload_debug=1` in prod). */
export function uploadLog(message: string, detail?: Record<string, unknown>): void {
  if (!isUploadDebugEnabled()) return;
  const stamp = `${ts()} ${message}`;
  if (detail !== undefined) {
    console.info("[upload]", stamp, detail);
  } else {
    console.info("[upload]", stamp);
  }
}

/** High-signal stage line for pipeline tracing (same guard as {@link uploadLog}). */
export function uploadStage(stage: string, detail?: Record<string, unknown>): void {
  uploadLog(stage, detail);
}
