export type PushPlatform = "ios" | "android" | "desktop" | "unknown";

export function detectPushPlatform(): PushPlatform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function detectBrowserName(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/CriOS|Chrome/i.test(ua) && !/Edg/i.test(ua)) return "chrome";
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "safari";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Edg/i.test(ua)) return "edge";
  return "other";
}

/** iOS 16.4+ web push requires installed PWA (standalone display mode). */
export function isIosStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && /Safari/i.test(navigator.userAgent);
}

export function pushSupportedInThisContext(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  if (isIosSafari() && !isIosStandalonePwa()) return false;
  return true;
}

export function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
