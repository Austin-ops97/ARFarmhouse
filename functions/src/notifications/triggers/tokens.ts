import * as logger from "firebase-functions/logger";
import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { getMessaging } from "firebase-admin/messaging";

import { BROADCAST_TOPIC, NOTIFICATION_TOKENS_SUB, USERS_COLLECTION } from "../constants";
import { subscribeTokenToGeneralTopic } from "../tokens";

export const onNotificationTokenCreated = onDocumentCreated(
  {
    document: `${USERS_COLLECTION}/{uid}/${NOTIFICATION_TOKENS_SUB}/{tokenId}`,
    region: "us-central1",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const token = snap.data().token;
    if (typeof token !== "string" || !token.length) return;

    try {
      await subscribeTokenToGeneralTopic(token);
    } catch (err) {
      logger.warn("Topic subscribe failed for new token", {
        uid: event.params.uid,
        err: String(err),
      });
    }
  }
);

export const onNotificationTokenDeleted = onDocumentDeleted(
  {
    document: `${USERS_COLLECTION}/{uid}/${NOTIFICATION_TOKENS_SUB}/{tokenId}`,
    region: "us-central1",
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const token = snap.data().token;
    if (typeof token !== "string" || !token.length) return;

    try {
      await getMessaging().unsubscribeFromTopic([token], BROADCAST_TOPIC);
    } catch (err) {
      logger.warn("Topic unsubscribe failed", { uid: event.params.uid, err: String(err) });
    }
  }
);
