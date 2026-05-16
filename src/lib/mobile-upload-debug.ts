/**
 * Mobile-focused upload tracing (Safari memory / visibility / stalls).
 * Enable logs with `localStorage.setItem('ar_upload_debug','1')` (same gate as {@link uploadLog}).
 */

import { uploadLog } from "@/lib/upload-log";

export function isMobileUploadHost(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return true;
  if (typeof window === "undefined") return false;
  return navigator.maxTouchPoints > 1 && window.matchMedia("(max-width: 768px)").matches;
}

/** Best-effort WebKit Mobile Safari (excludes Chrome/Firefox on iOS where UA differs). */
export function isLikelyMobileSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (!/iPhone|iPad|iPod/.test(ua)) return false;
  if (/CriOS|FxiOS|EdgiOS|OPT\//.test(ua)) return false;
  return /Safari\//.test(ua) || /AppleWebKit/.test(ua);
}

function visibilityState(): string {
  if (typeof document === "undefined") return "unknown";
  return document.visibilityState;
}

/** Structured line prefixed for filtering: `[mobile-upload] …` */
export function mobileUploadLog(message: string, detail?: Record<string, unknown>): void {
  uploadLog(`[mobile-upload] ${message}`, {
    mobileHost: isMobileUploadHost(),
    mobileSafari: isLikelyMobileSafari(),
    visibility: visibilityState(),
    ...detail,
  });
}
