import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { POSTS_COLLECTION } from "../constants";
import { dispatchTopicBroadcast } from "../dispatch";

type PostData = {
  authorId?: string;
  authorDisplayName?: string;
  title?: string | null;
  body?: string;
};

export const onFeedPostCreatedNotify = onDocumentCreated(
  { document: `${POSTS_COLLECTION}/{postId}`, region: "us-central1" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() as PostData;
    const postId = event.params.postId;
    const actorId = data.authorId ?? "";
    const actorName = (data.authorDisplayName as string | undefined)?.trim() || "A family member";

    if (!actorId) {
      logger.warn("Feed post missing authorId — skip broadcast", { postId });
      return;
    }

    await dispatchTopicBroadcast({
      title: "New Feed Post",
      body: `${actorName} posted an update.`,
      type: "property_update",
      actorId,
      actorDisplayName: actorName,
      routeNav: "feed",
      routePostId: postId,
      entityKind: "post",
      entityId: postId,
      deepLinkParams: { postId },
      fanOutInbox: true,
    });
  }
);
