import { randomUUID } from "crypto";

import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";

import { SIGNUP_REDEMPTION_TTL_MS } from "./config";

export const SIGNUP_REDEMPTIONS_COLLECTION = "signupRedemptions";

export type SignupRedemptionRecord = {
  emailLower: string;
  createdAt: FirebaseFirestore.FieldValue;
  expiresAt: FirebaseFirestore.Timestamp;
  used: boolean;
  usedAt: FirebaseFirestore.FieldValue | null;
  usedByUid: string | null;
};

/** Create a single-use redemption the client must attach to the Firestore profile on signup. */
export async function createSignupRedemption(emailLower: string): Promise<string> {
  const id = randomUUID();
  const expiresAt = Timestamp.fromMillis(Date.now() + SIGNUP_REDEMPTION_TTL_MS);
  const ref = getFirestore().collection(SIGNUP_REDEMPTIONS_COLLECTION).doc(id);

  await ref.set({
    emailLower,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
    used: false,
    usedAt: null,
    usedByUid: null,
  } satisfies SignupRedemptionRecord);

  return id;
}

export async function markSignupRedemptionUsed(redemptionId: string, uid: string): Promise<void> {
  const ref = getFirestore().collection(SIGNUP_REDEMPTIONS_COLLECTION).doc(redemptionId);
  await getFirestore().runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists) return;
    const data = snap.data();
    if (data?.used === true) return;
    txn.update(ref, {
      used: true,
      usedAt: FieldValue.serverTimestamp(),
      usedByUid: uid,
    });
  });
}
