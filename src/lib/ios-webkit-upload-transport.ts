/**
 * iOS / WebKit upload transport detection.
 *
 * All third-party browsers on iOS use WebKit — treat the platform as a single transport
 * surface for Firebase Storage (resumable/chunk uploads are unreliable on many builds).
 */

import { uploadLog, isUploadDebugEnabled } from "@/lib/upload-log";

/** Always logs to console so production Safari sessions can be diagnosed without localStorage. */
export function safariUploadLog(message: string, detail?: Record<string, unknown>): void {
  if (detail !== undefined) {
    console.info(`[safari-upload] ${message}`, detail);
  } else {
    console.info(`[safari-upload] ${message}`);
  }
  if (isUploadDebugEnabled()) {
    uploadLog(`[safari-upload] ${message}`, detail);
  }
}

/**
 * Use single-shot {@link import('firebase/storage').uploadBytes} instead of resumable uploads.
 * True for iPhone, iPod, iPad (including iPadOS “desktop” mode), and all iOS browsers (Safari, Chrome, Firefox, etc.).
 */
export function shouldUseSimpleIOSWebKitUpload(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPod|iPad/i.test(ua)) return true;
  // iPadOS 13+ can report as Mac + touch when “desktop site” is requested
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}
