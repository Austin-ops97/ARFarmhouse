import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

import { BROADCAST_TOPIC, NOTIFICATION_TOKENS_SUB, USERS_COLLECTION } from "./constants";

export type DeviceTokenRow = {
  token: string;
  platform?: string;
  browser?: string;
};

export async function listUserTokens(uid: string): Promise<DeviceTokenRow[]> {
  const db = getFirestore();
  const snap = await db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(NOTIFICATION_TOKENS_SUB)
    .get();
  const rows: DeviceTokenRow[] = [];
  snap.forEach((doc) => {
    const token = doc.data().token;
    if (typeof token === "string" && token.length > 0) {
      rows.push({
        token,
        platform: doc.data().platform as string | undefined,
        browser: doc.data().browser as string | undefined,
      });
    }
  });
  return rows;
}

export async function listAdminUids(): Promise<string[]> {
  const db = getFirestore();
  const snap = await db.collection(USERS_COLLECTION).limit(64).get();
  const uids: string[] = [];
  snap.forEach((doc) => {
    const role = doc.data().role;
    if (role === "admin" || role === "owner") uids.push(doc.id);
  });
  return uids;
}

export function userPushEnabled(data: FirebaseFirestore.DocumentData | undefined): boolean {
  if (!data) return true;
  if (data.notificationsEnabled === false) return false;
  const prefs = data.notificationPreferences as Record<string, unknown> | undefined;
  if (prefs && prefs.push === false) return false;
  return true;
}

export async function pruneInvalidTokens(
  uid: string,
  tokens: string[],
  response: { responses: { success: boolean; error?: { code?: string } }[] }
): Promise<void> {
  const db = getFirestore();
  const invalid: string[] = [];
  response.responses.forEach((r, i) => {
    if (r.success) return;
    const code = r.error?.code;
    if (
      code === "messaging/invalid-registration-token" ||
      code === "messaging/registration-token-not-registered"
    ) {
      const t = tokens[i];
      if (t) invalid.push(t);
    }
  });
  if (invalid.length === 0) return;

  const snap = await db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(NOTIFICATION_TOKENS_SUB)
    .get();
  const batch = db.batch();
  snap.forEach((doc) => {
    if (invalid.includes(doc.data().token as string)) {
      batch.delete(doc.ref);
    }
  });
  await batch.commit();
}

export async function subscribeTokenToGeneralTopic(token: string): Promise<void> {
  await getMessaging().subscribeToTopic([token], BROADCAST_TOPIC);
}
