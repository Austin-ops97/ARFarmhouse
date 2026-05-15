import { collection, doc, getDoc, getDocs, limit, query } from "firebase/firestore";

import { actionDebug } from "@/lib/action-debug";
import { tryGetFirestoreDb } from "@/lib/firebase";
import type { NotificationType } from "@/models/notification";
import { writeNotification } from "@/services/notifications";

export async function listFamilyMemberUids(excludeUid?: string): Promise<string[]> {
  const db = tryGetFirestoreDb();
  if (!db) return [];
  const snap = await getDocs(query(collection(db, "users"), limit(48)));
  const uids: string[] = [];
  snap.forEach((d) => {
    if (d.id && d.id !== excludeUid) uids.push(d.id);
  });
  return uids;
}

export async function notifyBookingCreated(input: {
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  tripTitle: string;
  dateLabel: string;
  calendarEventId: string;
  bookingRequestId: string;
}) {
  const recipients = await listFamilyMemberUids(input.actorId);
  const title = `${input.actorName} booked ${input.tripTitle}`;
  const body = `${input.dateLabel} · awaiting family confirmation`;
  await Promise.allSettled(
    recipients.map((recipientId) =>
      writeNotification(recipientId, {
        type: "booking_created",
        title,
        body,
        actorId: input.actorId,
        actorDisplayName: input.actorName,
        actorAvatarUrl: input.actorAvatarUrl,
        entityKind: "calendarEvent",
        entityId: input.calendarEventId,
        routeNav: "calendar",
        routeEventId: input.calendarEventId,
        routeBookingId: input.bookingRequestId,
        groupKey: `booking_${input.calendarEventId}`,
      })
    )
  );
}

export async function notifyFeedComment(input: {
  postId: string;
  commentId: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  parentId?: string | null;
  postTitle?: string;
}) {
  const db = tryGetFirestoreDb();
  if (!db) return;

  const postSnap = await getDoc(doc(db, "posts", input.postId));
  if (!postSnap.exists()) return;
  const postData = postSnap.data();
  const postAuthorId = postData?.authorId as string | undefined;
  const postTitle =
    (postData?.title as string | undefined)?.trim() ||
    (postData?.body as string | undefined)?.slice(0, 60) ||
    "your post";

  const isReply = Boolean(input.parentId);
  const type: NotificationType = isReply ? "feed_reply" : "feed_comment";

  const recipients = new Set<string>();
  if (postAuthorId && postAuthorId !== input.actorId) recipients.add(postAuthorId);

  if (isReply && input.parentId) {
    const parentSnap = await getDoc(doc(db, "posts", input.postId, "comments", input.parentId));
    const parentAuthorId = parentSnap.data()?.authorId as string | undefined;
    if (parentAuthorId && parentAuthorId !== input.actorId) recipients.add(parentAuthorId);
  }

  const title = isReply
    ? `${input.actorName} replied on ${postTitle}`
    : `${input.actorName} commented on ${postTitle}`;
  const body = isReply ? "New reply in the conversation" : "New comment on the feed";

  await Promise.allSettled(
    [...recipients].map((recipientId) =>
      writeNotification(recipientId, {
        type,
        title,
        body,
        actorId: input.actorId,
        actorDisplayName: input.actorName,
        actorAvatarUrl: input.actorAvatarUrl,
        entityKind: "comment",
        entityId: input.commentId,
        entityParentId: input.postId,
        routeNav: "feed",
        routePostId: input.postId,
        groupKey: `${type}_${input.postId}`,
      })
    )
  );
}

export async function notifyFeedReaction(input: {
  postId: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  emoji: string;
}) {
  const db = tryGetFirestoreDb();
  if (!db) return;
  const postSnap = await getDoc(doc(db, "posts", input.postId));
  if (!postSnap.exists()) return;
  const postAuthorId = postSnap.data()?.authorId as string | undefined;
  if (!postAuthorId || postAuthorId === input.actorId) return;

  const postTitle =
    (postSnap.data()?.title as string | undefined)?.trim() ||
    (postSnap.data()?.body as string | undefined)?.slice(0, 48) ||
    "your post";

  await writeNotification(postAuthorId, {
    type: "feed_reaction",
    title: `${input.actorName} reacted ${input.emoji}`,
    body: `On ${postTitle}`,
    actorId: input.actorId,
    actorDisplayName: input.actorName,
    actorAvatarUrl: input.actorAvatarUrl,
    entityKind: "post",
    entityId: input.postId,
    routeNav: "feed",
    routePostId: input.postId,
    groupKey: `reaction_${input.postId}_${input.actorId}`,
  });
}

export async function notifyTaskCreated(input: {
  taskId: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  taskTitle: string;
}) {
  const recipients = await listFamilyMemberUids(input.actorId);
  await Promise.allSettled(
    recipients.map((recipientId) =>
      writeNotification(recipientId, {
        type: "task_created",
        title: `New task · ${input.taskTitle}`,
        body: `${input.actorName} added a household task`,
        actorId: input.actorId,
        actorDisplayName: input.actorName,
        actorAvatarUrl: input.actorAvatarUrl,
        entityKind: "task",
        entityId: input.taskId,
        routeNav: "tasks",
        groupKey: `task_${input.taskId}`,
      })
    )
  );
  actionDebug("notify", "task fan-out", { recipients: recipients.length });
}
