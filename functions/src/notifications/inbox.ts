import { FieldValue, type Firestore } from "firebase-admin/firestore";

import { NOTIFICATIONS_SUB, USERS_COLLECTION } from "./constants";
import type { DeepLinkParams } from "./deep-link";
import { buildDeepLinkPath } from "./deep-link";

export type InboxNotificationInput = {
  recipientId: string;
  type: string;
  title: string;
  body: string;
  actorId: string;
  actorDisplayName: string;
  actorAvatarUrl?: string | null;
  entityKind: string;
  entityId: string;
  entityParentId?: string | null;
  routeNav: string;
  routePostId?: string | null;
  routeEventId?: string | null;
  routeBookingId?: string | null;
  groupKey?: string | null;
  metadata?: Record<string, unknown> | null;
  deepLinkParams?: DeepLinkParams;
};

function notificationDocId(input: InboxNotificationInput): string {
  const base = `${input.type}_${input.entityId}_${input.actorId}`.replace(/[^a-zA-Z0-9_-]/g, "_");
  return base.slice(0, 120);
}

export async function writeInboxNotification(
  db: Firestore,
  input: InboxNotificationInput,
  siteOrigin?: string
): Promise<string> {
  const id = notificationDocId(input);
  const deepLink =
    input.deepLinkParams != null
      ? buildDeepLinkPath(input.deepLinkParams, siteOrigin)
      : buildDeepLinkPath(
          {
            postId: input.routePostId ?? undefined,
            bookingId: input.routeBookingId ?? undefined,
            nav: input.routeNav,
          },
          siteOrigin
        );

  await db
    .collection(USERS_COLLECTION)
    .doc(input.recipientId)
    .collection(NOTIFICATIONS_SUB)
    .doc(id)
    .set(
      {
        type: input.type,
        title: input.title,
        body: input.body,
        actorId: input.actorId,
        actorDisplayName: input.actorDisplayName,
        actorAvatarUrl: input.actorAvatarUrl ?? null,
        readAt: null,
        createdAt: FieldValue.serverTimestamp(),
        entityKind: input.entityKind,
        entityId: input.entityId,
        entityParentId: input.entityParentId ?? null,
        routeNav: input.routeNav,
        routePostId: input.routePostId ?? null,
        routeEventId: input.routeEventId ?? null,
        routeBookingId: input.routeBookingId ?? null,
        groupKey: input.groupKey ?? null,
        deepLink,
        metadata: input.metadata ?? null,
      },
      { merge: true }
    );

  return id;
}
