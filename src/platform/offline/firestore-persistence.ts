/**
 * Firestore offline persistence — enables cached reads and queued writes in poor connectivity.
 */

import {
  disableNetwork,
  enableIndexedDbPersistence,
  enableNetwork,
  type Firestore,
} from "firebase/firestore";

import { logger } from "@/platform/logging/logger";

let persistenceAttempted = false;
let persistenceEnabled = false;

export function isFirestorePersistenceEnabled(): boolean {
  return persistenceEnabled;
}

/**
 * Call once after Firestore is first obtained. Safe to call multiple times (no-ops after first).
 */
export async function enableFirestoreOfflinePersistence(db: Firestore): Promise<boolean> {
  if (persistenceAttempted) return persistenceEnabled;
  persistenceAttempted = true;

  if (typeof window === "undefined") return false;

  try {
    await enableIndexedDbPersistence(db);
    persistenceEnabled = true;
    logger.info("Firestore offline persistence enabled");
    return true;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "failed-precondition") {
      logger.warn("Firestore persistence unavailable — multiple tabs open");
    } else if (code === "unimplemented") {
      logger.warn("Firestore persistence not supported in this browser");
    } else {
      logger.warn("Firestore persistence failed", { err: String(err) });
    }
    return false;
  }
}

export async function goOffline(db: Firestore): Promise<void> {
  await disableNetwork(db);
}

export async function goOnline(db: Firestore): Promise<void> {
  await enableNetwork(db);
}
