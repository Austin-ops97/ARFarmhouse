/**
 * Lightweight client-side rate limiting for abuse prevention (UX layer; not authoritative).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitConfig = {
  key: string;
  max: number;
  windowMs: number;
};

export function checkRateLimit(config: RateLimitConfig): boolean {
  const now = Date.now();
  const existing = buckets.get(config.key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(config.key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }

  if (existing.count >= config.max) {
    return false;
  }

  existing.count += 1;
  return true;
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Standard limits for high-frequency user actions */
export const RATE_LIMITS = {
  postCreate: { max: 8, windowMs: 60_000 },
  bookingCreate: { max: 5, windowMs: 300_000 },
  commentCreate: { max: 30, windowMs: 60_000 },
} as const;

export function rateLimitKey(uid: string, action: string): string {
  return `${uid}:${action}`;
}
