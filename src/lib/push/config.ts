import { isFirebaseConfigured, readPublicFirebaseConfig } from "@/lib/firebase/env";
import { readVapidKey } from "@/lib/firebase/messaging";

import { pushLog } from "./log";

const FIREBASE_PUBLIC_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export type PushConfigStatus = {
  firebaseConfigured: boolean;
  vapidConfigured: boolean;
  siteUrlConfigured: boolean;
  missingFirebaseKeys: string[];
};

export function getPushConfigStatus(): PushConfigStatus {
  const cfg = readPublicFirebaseConfig();
  const missingFirebaseKeys: string[] = [];

  if (!cfg) {
    const values: Record<(typeof FIREBASE_PUBLIC_KEYS)[number], string> = {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    };
    for (const key of FIREBASE_PUBLIC_KEYS) {
      if (!values[key]?.trim()) missingFirebaseKeys.push(key);
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";

  return {
    firebaseConfigured: isFirebaseConfigured(),
    vapidConfigured: readVapidKey() !== null,
    siteUrlConfigured: siteUrl.length > 0,
    missingFirebaseKeys,
  };
}

let configWarningsLogged = false;

/** Log missing push-related env once per session (safe in production). */
export function logPushConfigWarningsOnce(): void {
  if (configWarningsLogged || typeof window === "undefined") return;
  configWarningsLogged = true;

  const status = getPushConfigStatus();
  if (!status.firebaseConfigured) {
    pushLog("warn", "Firebase web config incomplete — push disabled", {
      missing: status.missingFirebaseKeys,
    });
    return;
  }
  if (!status.vapidConfigured) {
    pushLog("warn", "NEXT_PUBLIC_FIREBASE_VAPID_KEY missing — device token registration disabled", {
      hint: "Firebase Console → Project settings → Cloud Messaging → Web Push certificates",
    });
  }
  if (!status.siteUrlConfigured) {
    pushLog("warn", "NEXT_PUBLIC_SITE_URL unset — share/deep links fall back to window.origin", {});
  }
}
