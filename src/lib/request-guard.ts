/**
 * Client-side guards against duplicate submissions and rapid re-clicks.
 */

const inFlight = new Map<string, number>();
const recentKeys = new Map<string, number>();

const DEFAULT_DEBOUNCE_MS = 800;
const DEDUPE_WINDOW_MS = 4000;

export function mutationKey(scope: string, action: string, id?: string): string {
  return `${scope}:${action}${id ? `:${id}` : ""}`;
}

export function isMutationInFlight(key: string): boolean {
  return inFlight.has(key);
}

export function beginMutation(key: string): boolean {
  if (inFlight.has(key)) return false;
  inFlight.set(key, Date.now());
  return true;
}

export function endMutation(key: string): void {
  inFlight.delete(key);
}

/** Returns false if the same key was used within the dedupe window. */
export function checkDedupe(key: string, windowMs = DEDUPE_WINDOW_MS): boolean {
  const last = recentKeys.get(key);
  const now = Date.now();
  if (last && now - last < windowMs) return false;
  recentKeys.set(key, now);
  if (recentKeys.size > 200) {
    for (const [k, t] of recentKeys) {
      if (now - t > windowMs * 2) recentKeys.delete(k);
    }
  }
  return true;
}

export function debounceMs(custom?: number): number {
  return custom ?? DEFAULT_DEBOUNCE_MS;
}

export async function guardedMutation<T>(
  key: string,
  fn: () => Promise<T>,
  options?: { dedupe?: boolean; dedupeWindowMs?: number }
): Promise<T> {
  if (!beginMutation(key)) {
    throw new Error("Please wait — this action is already in progress.");
  }
  if (options?.dedupe !== false && !checkDedupe(key, options?.dedupeWindowMs)) {
    endMutation(key);
    throw new Error("This request was just submitted. Please wait a moment.");
  }
  try {
    return await fn();
  } finally {
    endMutation(key);
  }
}
