import { createHash } from "crypto";

import { getFirestore, Timestamp } from "firebase-admin/firestore";

const COLLECTION = "_security";
const DOC_ID = "inviteValidation";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 12;
const LOCKOUT_MS = 30 * 60 * 1000;

type RateLimitBucket = {
  count?: number;
  windowStart?: FirebaseFirestore.Timestamp;
  lockedUntil?: FirebaseFirestore.Timestamp;
};

function hashClientKey(ip: string | undefined, forwardedFor: string | undefined): string {
  const raw = (forwardedFor?.split(",")[0]?.trim() || ip || "unknown").slice(0, 128);
  return createHash("sha256").update(`invite:${raw}`).digest("hex");
}

export type RateLimitResult = { allowed: true } | { allowed: false };

/**
 * Firestore-backed sliding-window rate limit per client IP.
 * Returns blocked when attempts exceed threshold within the window.
 */
export async function checkInviteValidationRateLimit(opts: {
  ip?: string;
  forwardedFor?: string;
}): Promise<RateLimitResult> {
  const key = hashClientKey(opts.ip, opts.forwardedFor);
  const ref = getFirestore().collection(COLLECTION).doc(DOC_ID);
  const now = Date.now();
  const nowTs = Timestamp.fromMillis(now);

  return getFirestore().runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const data = (snap.data() ?? {}) as Record<string, RateLimitBucket>;
    const bucket: RateLimitBucket = data[key] ?? {};

    if (bucket.lockedUntil && bucket.lockedUntil.toMillis() > now) {
      return { allowed: false };
    }

    const windowStartMs = bucket.windowStart?.toMillis() ?? 0;
    const inWindow = now - windowStartMs < WINDOW_MS;
    const count = inWindow ? (bucket.count ?? 0) : 0;
    const nextCount = count + 1;

    if (nextCount > MAX_ATTEMPTS) {
      txn.set(
        ref,
        {
          [key]: {
            count: nextCount,
            windowStart: inWindow ? bucket.windowStart : nowTs,
            lockedUntil: Timestamp.fromMillis(now + LOCKOUT_MS),
          },
        },
        { merge: true }
      );
      return { allowed: false };
    }

    const nextBucket: RateLimitBucket = {
      count: nextCount,
      windowStart: inWindow ? bucket.windowStart : nowTs,
    };
    txn.set(ref, { [key]: nextBucket }, { merge: true });
    return { allowed: true };
  });
}
