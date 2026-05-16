/**
 * Tracks Firestore snapshot unsubscribes for leak prevention in long sessions.
 */

import { logger } from "@/platform/logging/logger";

type ListenerEntry = {
  id: string;
  scope: string;
  createdAt: number;
  unsubscribe: () => void;
};

const listeners = new Map<string, ListenerEntry>();
let idCounter = 0;

export function registerListener(
  scope: string,
  unsubscribe: () => void
): () => void {
  const id = `ls-${++idCounter}`;
  listeners.set(id, { id, scope, createdAt: Date.now(), unsubscribe });

  return () => {
    const entry = listeners.get(id);
    if (entry) {
      try {
        entry.unsubscribe();
      } catch (err) {
        logger.warn("Listener unsubscribe failed", { scope, err: String(err) });
      }
      listeners.delete(id);
    }
  };
}

export function unregisterAllListeners(scope?: string): void {
  for (const [id, entry] of listeners) {
    if (scope && entry.scope !== scope) continue;
    try {
      entry.unsubscribe();
    } catch {
      /* ignore */
    }
    listeners.delete(id);
  }
}

export function getActiveListenerCount(scope?: string): number {
  if (!scope) return listeners.size;
  return [...listeners.values()].filter((e) => e.scope === scope).length;
}
