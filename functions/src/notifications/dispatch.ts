import { getFirestore } from "firebase-admin/firestore";
import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";

import { BROADCAST_TOPIC } from "./constants";
import type { DeepLinkParams } from "./deep-link";
import { buildDeepLinkPath } from "./deep-link";
import { writeInboxNotification, type InboxNotificationInput } from "./inbox";
import { listUserTokens, pruneInvalidTokens, userPushEnabled } from "./tokens";

const SITE_ORIGIN = process.env.SITE_ORIGIN?.replace(/\/$/, "") ?? "";

if (!SITE_ORIGIN && process.env.FUNCTIONS_EMULATOR !== "true") {
  logger.warn(
    "SITE_ORIGIN is not set — push deep links will use relative paths only. Set SITE_ORIGIN in Functions config for production."
  );
}

export type PushDataPayload = {
  title: string;
  body: string;
  type: string;
  notificationId: string;
  nav: string;
  deepLink: string;
  postId?: string;
  bookingId?: string;
  eventId?: string;
};

function buildDataPayload(
  input: InboxNotificationInput,
  notificationId: string,
  deepLink: string,
  title: string,
  body: string
): PushDataPayload {
  return {
    title,
    body,
    type: input.type,
    notificationId,
    nav: input.routeNav,
    deepLink,
    ...(input.routePostId ? { postId: input.routePostId } : {}),
    ...(input.routeBookingId ? { bookingId: input.routeBookingId } : {}),
    ...(input.routeEventId ? { eventId: input.routeEventId } : {}),
  };
}

/** Web push: data-only payload — service worker displays once (avoids FCM auto + manual duplicate). */
function toFcmDataStrings(data: PushDataPayload): Record<string, string> {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));
}

async function sendMulticastToUser(
  uid: string,
  title: string,
  body: string,
  data: PushDataPayload
): Promise<void> {
  const db = getFirestore();
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userPushEnabled(userSnap.data())) return;

  const tokenRows = await listUserTokens(uid);
  const tokens = tokenRows.map((r) => r.token);
  if (tokens.length === 0) return;

  const message: MulticastMessage = {
    tokens,
    data: toFcmDataStrings(data),
    webpush: {
      fcmOptions: { link: data.deepLink || "/" },
    },
  };

  try {
    const result = await getMessaging().sendEachForMulticast(message);
    if (result.failureCount > 0) {
      await pruneInvalidTokens(uid, tokens, result);
    }
  } catch (err) {
    logger.warn("FCM multicast failed", { uid, err: String(err) });
  }
}

/** Targeted notification: inbox doc + device push for one user. */
export async function dispatchToUser(
  input: InboxNotificationInput,
  opts?: { skipPush?: boolean }
): Promise<void> {
  const notificationId = await writeInboxNotification(getFirestore(), input, SITE_ORIGIN);
  if (opts?.skipPush) return;

  const deepLink =
    input.deepLinkParams != null
      ? buildDeepLinkPath(input.deepLinkParams, SITE_ORIGIN)
      : buildDeepLinkPath(
          {
            postId: input.routePostId ?? undefined,
            bookingId: input.routeBookingId ?? undefined,
          },
          SITE_ORIGIN
        );
  const data = buildDataPayload(input, notificationId, deepLink, input.title, input.body);
  await sendMulticastToUser(input.recipientId, input.title, input.body, data);
}

/** Targeted notification for multiple users (each gets own inbox doc). */
export async function dispatchToUsers(
  recipientIds: string[],
  buildInput: (recipientId: string) => InboxNotificationInput
): Promise<void> {
  const unique = [...new Set(recipientIds.filter(Boolean))];
  await Promise.allSettled(unique.map((uid) => dispatchToUser(buildInput(uid))));
}

/** Broadcast via FCM topic — no per-user inbox (optional: fan-out inbox for history). */
export async function dispatchTopicBroadcast(input: {
  title: string;
  body: string;
  type: string;
  actorId: string;
  actorDisplayName: string;
  routeNav: string;
  routePostId?: string;
  entityKind: string;
  entityId: string;
  deepLinkParams?: DeepLinkParams;
  /** When true, writes inbox notification for every user (for in-app history). */
  fanOutInbox?: boolean;
}): Promise<void> {
  const deepLink = buildDeepLinkPath(
    input.deepLinkParams ?? { postId: input.routePostId },
    SITE_ORIGIN
  );

  const data: PushDataPayload = {
    title: input.title,
    body: input.body,
    type: input.type,
    notificationId: `${input.type}_${input.entityId}`,
    nav: input.routeNav,
    deepLink,
    ...(input.routePostId ? { postId: input.routePostId } : {}),
  };

  try {
    await getMessaging().send({
      topic: BROADCAST_TOPIC,
      data: toFcmDataStrings(data),
      webpush: {
        fcmOptions: { link: deepLink || "/" },
      },
    });
  } catch (err) {
    logger.error("FCM topic broadcast failed", { topic: BROADCAST_TOPIC, err: String(err) });
  }

  if (!input.fanOutInbox) return;

  const db = getFirestore();
  const usersSnap = await db.collection("users").limit(64).get();
  const recipients: string[] = [];
  usersSnap.forEach((doc) => {
    if (doc.id !== input.actorId && userPushEnabled(doc.data())) {
      recipients.push(doc.id);
    }
  });

  await Promise.allSettled(
    recipients.map((recipientId) =>
      dispatchToUser(
        {
          recipientId,
          type: input.type,
          title: input.title,
          body: input.body,
          actorId: input.actorId,
          actorDisplayName: input.actorDisplayName,
          actorAvatarUrl: null,
          entityKind: input.entityKind,
          entityId: input.entityId,
          routeNav: input.routeNav,
          routePostId: input.routePostId ?? null,
          groupKey: `${input.type}_${input.entityId}`,
          deepLinkParams: input.deepLinkParams,
        },
        { skipPush: true }
      )
    )
  );
}
