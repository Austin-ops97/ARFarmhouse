import { getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { dispatchToUser } from "../dispatch";

/** Targeted feed comment / reply notifications (not broadcast). */
export const onFeedCommentCreatedNotify = onDocumentCreated(
  { document: "posts/{postId}/comments/{commentId}", region: "us-central1" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const postId = event.params.postId;
    const commentId = event.params.commentId;
    const actorId = data.authorId as string | undefined;
    const actorName = (data.authorDisplayName as string | undefined)?.trim() || "Someone";
    const parentId = data.parentId as string | null | undefined;

    if (!actorId) return;

    const db = getFirestore();
    const postSnap = await db.collection("posts").doc(postId).get();
    if (!postSnap.exists) return;
    const postData = postSnap.data() ?? {};
    const postAuthorId = postData.authorId as string | undefined;
    const postTitle =
      (postData.title as string | undefined)?.trim() ||
      (postData.body as string | undefined)?.slice(0, 60) ||
      "your post";

    const isReply = Boolean(parentId);
    const type = isReply ? "feed_reply" : "feed_comment";
    const recipients = new Set<string>();

    if (postAuthorId && postAuthorId !== actorId) recipients.add(postAuthorId);

    if (isReply && parentId) {
      const parentSnap = await db.collection("posts").doc(postId).collection("comments").doc(parentId).get();
      const parentAuthorId = parentSnap.data()?.authorId as string | undefined;
      if (parentAuthorId && parentAuthorId !== actorId) recipients.add(parentAuthorId);
    }

    const title = isReply
      ? `${actorName} replied on ${postTitle}`
      : `${actorName} commented on ${postTitle}`;
    const body = isReply ? "New reply in the conversation" : "New comment on the feed";

    await Promise.allSettled(
      [...recipients].map((recipientId) =>
        dispatchToUser({
          recipientId,
          type,
          title,
          body,
          actorId,
          actorDisplayName: actorName,
          entityKind: "comment",
          entityId: commentId,
          entityParentId: postId,
          routeNav: "feed",
          routePostId: postId,
          groupKey: `${type}_${postId}`,
          deepLinkParams: { postId },
        })
      )
    );
  }
);

export const onFeedReactionCreatedNotify = onDocumentCreated(
  { document: "posts/{postId}/reactions/{uid}", region: "us-central1" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const postId = event.params.postId;
    const actorId = event.params.uid;
    const emoji = (data.emoji as string | undefined) || "👍";

    const db = getFirestore();
    const postSnap = await db.collection("posts").doc(postId).get();
    if (!postSnap.exists) return;
    const postAuthorId = postSnap.data()?.authorId as string | undefined;
    if (!postAuthorId || postAuthorId === actorId) return;

    const userSnap = await db.collection("users").doc(actorId).get();
    const actorName = (userSnap.data()?.displayName as string | undefined)?.trim() || "Someone";

    const postTitle =
      (postSnap.data()?.title as string | undefined)?.trim() ||
      (postSnap.data()?.body as string | undefined)?.slice(0, 48) ||
      "your post";

    await dispatchToUser({
      recipientId: postAuthorId,
      type: "feed_reaction",
      title: `${actorName} reacted ${emoji}`,
      body: `On ${postTitle}`,
      actorId,
      actorDisplayName: actorName,
      entityKind: "post",
      entityId: postId,
      routeNav: "feed",
      routePostId: postId,
      groupKey: `reaction_${postId}_${actorId}`,
      deepLinkParams: { postId },
    });
  }
);
