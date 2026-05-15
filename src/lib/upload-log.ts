/**
 * Structured upload tracing — enable in prod via `localStorage.setItem('ar_upload_debug','1')`.
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

/** Logs `[upload] message` plus optional structured detail. */
export function uploadLog(message: string, detail?: Record<string, unknown>): void {
  if (!isUploadDebugEnabled()) return;
  if (detail !== undefined) {
    console.info("[upload]", message, detail);
  } else {
    console.info("[upload]", message);
  }
}
