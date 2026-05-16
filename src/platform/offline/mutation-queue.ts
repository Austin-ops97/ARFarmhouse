/**
 * Client-side mutation retry queue for poor-signal environments.
 * Persists to sessionStorage; flushes on reconnect.
 */

import { trackEvent } from "@/platform/logging/monitoring";

const QUEUE_KEY = "ar-offline-mutation-queue-v1";
const MAX_QUEUE = 50;
const MAX_ATTEMPTS = 5;

export type QueuedMutation = {
  id: string;
  scope: string;
  label: string;
  createdAt: number;
  attempts: number;
  /** Serialized payload for replay — caller supplies executor */
  payload: unknown;
};

type MutationExecutor = (mutation: QueuedMutation) => Promise<void>;

let executor: MutationExecutor | null = null;
let flushing = false;

function loadQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedMutation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMutation[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    /* quota */
  }
}

export function registerMutationExecutor(fn: MutationExecutor): void {
  executor = fn;
}

export function getPendingMutationCount(): number {
  return loadQueue().length;
}

export function enqueueMutation(
  scope: string,
  label: string,
  payload: unknown
): QueuedMutation {
  const queue = loadQueue();
  const entry: QueuedMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    scope,
    label,
    createdAt: Date.now(),
    attempts: 0,
    payload,
  };
  queue.push(entry);
  saveQueue(queue);
  return entry;
}

export async function flushMutationQueue(): Promise<{ flushed: number; failed: number }> {
  if (flushing || !executor) return { flushed: 0, failed: 0 };
  flushing = true;
  let flushed = 0;
  let failed = 0;

  try {
    const queue = loadQueue();
    const remaining: QueuedMutation[] = [];

    for (const mutation of queue) {
      try {
        await executor(mutation);
        flushed += 1;
      } catch {
        mutation.attempts += 1;
        if (mutation.attempts < MAX_ATTEMPTS) {
          remaining.push(mutation);
        } else {
          failed += 1;
        }
      }
    }

    saveQueue(remaining);
    if (flushed > 0) {
      trackEvent("offline.queue_flush", { flushed, failed, remaining: remaining.length });
    }
    return { flushed, failed };
  } finally {
    flushing = false;
  }
}

export function clearMutationQueue(): void {
  saveQueue([]);
}
