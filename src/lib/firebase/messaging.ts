import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
  type MessagePayload,
} from "firebase/messaging";

import { readPublicFirebaseConfig } from "@/lib/firebase/env";
import { pushLog } from "@/lib/push/log";

let messagingInstance: Messaging | null | undefined;
let messagingSupported: boolean | null = null;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

async function resolveMessagingApp(): Promise<FirebaseApp | null> {
  const cfg = readPublicFirebaseConfig();
  if (!cfg) return null;
  try {
    return getApps().length > 0 ? getApp() : initializeApp(cfg);
  } catch {
    return null;
  }
}

export async function isFirebaseMessagingSupported(): Promise<boolean> {
  if (messagingSupported !== null) return messagingSupported;
  try {
    messagingSupported = await isSupported();
  } catch {
    messagingSupported = false;
  }
  return messagingSupported;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingInstance !== undefined) return messagingInstance;
  const supported = await isFirebaseMessagingSupported();
  if (!supported) {
    messagingInstance = null;
    return null;
  }
  const app = await resolveMessagingApp();
  if (!app) {
    messagingInstance = null;
    return null;
  }
  try {
    messagingInstance = getMessaging(app);
  } catch {
    messagingInstance = null;
  }
  return messagingInstance;
}

export function readVapidKey(): string | null {
  const key =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim()
      : undefined;
  return key && key.length > 0 ? key : null;
}

export async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  if (serviceWorkerRegistration?.active) return serviceWorkerRegistration;
  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    return serviceWorkerRegistration;
  } catch (err) {
    pushLog("warn", "FCM service worker registration failed", { err: String(err) });
    return null;
  }
}

const TOKEN_RETRY_DELAYS_MS = [0, 800, 2000];

function isRetryableTokenError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /network|timeout|service-worker|registration|failed-service-worker/i.test(msg);
}

export type FetchFcmTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: "unsupported" | "firebase" | "vapid" | "service_worker" | "permission" | "token" };

/** Obtain FCM device token with VAPID key and bounded retries. */
export async function fetchFcmDeviceToken(): Promise<FetchFcmTokenResult> {
  const vapidKey = readVapidKey();
  if (!vapidKey) {
    pushLog("warn", "Skipping getToken — NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set");
    return { ok: false, reason: "vapid" };
  }

  const supported = await isFirebaseMessagingSupported();
  if (!supported) return { ok: false, reason: "unsupported" };

  const messaging = await getFirebaseMessaging();
  if (!messaging) return { ok: false, reason: "firebase" };

  if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
    return { ok: false, reason: "permission" };
  }

  const registration = await registerMessagingServiceWorker();
  if (!registration) return { ok: false, reason: "service_worker" };

  let lastError: unknown;
  for (let attempt = 0; attempt < TOKEN_RETRY_DELAYS_MS.length; attempt++) {
    const delay = TOKEN_RETRY_DELAYS_MS[attempt] ?? 0;
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
      if (token) {
        pushLog("info", "FCM device token obtained");
        return { ok: true, token };
      }
    } catch (err) {
      lastError = err;
      if (!isRetryableTokenError(err) || attempt === TOKEN_RETRY_DELAYS_MS.length - 1) break;
      pushLog("warn", "getToken retry", { attempt: attempt + 1, err: String(err) });
    }
  }

  pushLog("warn", "getToken failed", { err: String(lastError) });
  return { ok: false, reason: "token" };
}

export function subscribeForegroundMessages(
  handler: (payload: MessagePayload) => void
): (() => void) | null {
  void getFirebaseMessaging().then((messaging) => {
    if (!messaging) return;
    onMessage(messaging, handler);
  });
  return () => {};
}
