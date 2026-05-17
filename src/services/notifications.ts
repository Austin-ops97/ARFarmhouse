import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";

import { actionDebug } from "@/lib/action-debug";
import { tryGetFirestoreDb } from "@/lib/firebase";
import type { FamilyNotification, FirestoreNotification, NotificationType } from "@/models/notification";
import type { NavId } from "@/components/ar-farmhouse/dashboard-nav";

const MAX_INBOX = 64;

export type WriteNotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  actorId: string;
  actorDisplayName: string;
  actorAvatarUrl: string | null;
  entityKind: FirestoreNotification["entityKind"];
  entityId: string;
  entityParentId?: string;
  routeNav: NavId;
  routePostId?: string;
  routeEventId?: string;
  routeBookingId?: string;
  groupKey?: string;
};

export function notificationDocId(input: WriteNotificationInput): string {
  const base = `${input.type}_${input.entityId}_${input.actorId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  return base.slice(0, 120);
}

function mapNotificationDoc(snapshot: QueryDocumentSnapshot<DocumentData>): FamilyNotification {
  const d = snapshot.data() as Partial<FirestoreNotification>;
  const created = d.createdAt?.toDate?.() ?? new Date();
  const read = d.readAt?.toDate?.() ?? null;
  return {
    id: snapshot.id,
    type: (d.type as NotificationType) ?? "property_update",
    title: d.title ?? "",
    body: d.body ?? "",
    actorId: d.actorId ?? "",
    actorDisplayName: d.actorDisplayName ?? "Family",
    actorAvatarUrl: d.actorAvatarUrl ?? null,
    readAt: read ? read.getTime() : null,
    createdAt: created.getTime(),
    entity: {
      kind: d.entityKind ?? "post",
      id: d.entityId ?? snapshot.id,
      parentId: d.entityParentId ?? undefined,
    },
    route: {
      nav: (d.routeNav as NavId) ?? "home",
      postId: d.routePostId ?? undefined,
      eventId: d.routeEventId ?? undefined,
      bookingId: d.routeBookingId ?? undefined,
    },
    groupKey: d.groupKey ?? undefined,
    deepLink: d.deepLink ?? undefined,
    metadata: d.metadata ?? undefined,
  };
}

export function subscribeNotifications(
  uid: string,
  onRows: (rows: FamilyNotification[]) => void,
  onError?: (e: Error) => void
) {
  const db = tryGetFirestoreDb();
  if (!db) {
    onRows([]);
    return () => {};
  }
  const q = query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(MAX_INBOX)
  );
  return onSnapshot(
    q,
    (snap) => onRows(snap.docs.map(mapNotificationDoc)),
    (err) => {
      actionDebug("notify", "subscribe error", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

/**
 * @deprecated Client writes are blocked by Firestore rules. Notifications are created by Cloud Functions.
 */
export async function writeNotification(recipientId: string, input: WriteNotificationInput) {
  const db = tryGetFirestoreDb();
  if (!db) return;
  const id = notificationDocId(input);
  const ref = doc(db, "users", recipientId, "notifications", id);
  await setDoc(
    ref,
    {
      type: input.type,
      title: input.title,
      body: input.body,
      actorId: input.actorId,
      actorDisplayName: input.actorDisplayName,
      actorAvatarUrl: input.actorAvatarUrl ?? null,
      readAt: null,
      createdAt: serverTimestamp(),
      entityKind: input.entityKind,
      entityId: input.entityId,
      entityParentId: input.entityParentId ?? null,
      routeNav: input.routeNav,
      routePostId: input.routePostId ?? null,
      routeEventId: input.routeEventId ?? null,
      routeBookingId: input.routeBookingId ?? null,
      groupKey: input.groupKey ?? null,
    },
    { merge: true }
  );
}

export async function markNotificationRead(uid: string, notificationId: string) {
  const db = tryGetFirestoreDb();
  if (!db) return;
  await updateDoc(doc(db, "users", uid, "notifications", notificationId), {
    readAt: serverTimestamp(),
  });
}

export async function markAllNotificationsRead(uid: string, ids: string[]) {
  const db = tryGetFirestoreDb();
  if (!db || ids.length === 0) return;
  const batch = writeBatch(db);
  const ts = serverTimestamp() as Timestamp;
  for (const id of ids.slice(0, 40)) {
    batch.update(doc(db, "users", uid, "notifications", id), { readAt: ts });
  }
  await batch.commit();
}

export async function dismissNotification(uid: string, notificationId: string) {
  const db = tryGetFirestoreDb();
  if (!db) return;
  await deleteDoc(doc(db, "users", uid, "notifications", notificationId));
}
