import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { markSignupRedemptionUsed } from "./redemptions";

/** Marks invite redemptions as consumed after a profile is successfully created. */
export const onUserProfileCreatedMarkInvite = onDocumentCreated(
  {
    document: "users/{userId}",
    region: "us-central1",
  },
  async (event) => {
    const redemptionId = event.data?.data()?.signupRedemptionId;
    if (typeof redemptionId !== "string" || !redemptionId.trim()) return;

    const uid = event.params.userId;
    try {
      await markSignupRedemptionUsed(redemptionId.trim(), uid);
    } catch (err) {
      logger.warn("failed to mark signup redemption used", { redemptionId, uid, err: String(err) });
    }
  }
);
