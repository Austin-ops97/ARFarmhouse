import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { actionDebug } from "@/lib/action-debug";
import { pushLog } from "@/lib/push/log";
import { tryGetFirestoreDb } from "@/lib/firebase";
import { NOTIFICATION_TOKENS_SUB } from "@/lib/push/constants";
import { detectBrowserName, detectPushPlatform } from "@/lib/push/platform";

function tokenDocId(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0;
  }
  return `t_${Math.abs(hash).toString(36)}`;
}

export async function upsertPushToken(uid: string, token: string): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db || !token) return;

  const id = tokenDocId(token);
  const ref = doc(db, "users", uid, NOTIFICATION_TOKENS_SUB, id);
  await setDoc(
    ref,
    {
      token,
      platform: detectPushPlatform(),
      browser: detectBrowserName(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  actionDebug("push", "token registered", { uid, id });
  pushLog("info", "Firestore push token saved", { uid, id });
}

export async function removePushToken(uid: string, token: string): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db || !token) return;
  const id = tokenDocId(token);
  await deleteDoc(doc(db, "users", uid, NOTIFICATION_TOKENS_SUB, id));
}

export async function removeStaleTokensForUser(uid: string, keepToken: string): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;
  const snap = await getDocs(
    query(collection(db, "users", uid, NOTIFICATION_TOKENS_SUB), where("token", "!=", keepToken))
  );
  if (snap.empty) return;
  await Promise.allSettled(snap.docs.map((d) => deleteDoc(d.ref)));
  pushLog("info", "Removed stale push tokens", { uid, count: snap.size });
}

export async function syncUserNotificationPrefs(
  uid: string,
  input: { notificationsEnabled: boolean; push?: boolean }
): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;
  await setDoc(
    doc(db, "users", uid),
    {
      notificationsEnabled: input.notificationsEnabled,
      notificationPreferences: {
        push: input.push ?? input.notificationsEnabled,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
