"use client";

import { useEffect } from "react";

import { tryGetFirestoreDb } from "@/lib/firebase";
import { prepareMonitoringIntegrations } from "@/platform/logging/monitoring";
import { enableFirestoreOfflinePersistence } from "@/platform/offline/firestore-persistence";
import { useOfflineReconnect } from "@/platform/offline/reconnect";
import { useOfflineStore } from "@/platform/state/offline-store";

/**
 * One-time platform initialization: offline persistence, monitoring hooks, reconnect.
 */
export function PlatformBootstrap() {
  const setPersistence = useOfflineStore((s) => s.setFirestorePersistence);
  useOfflineReconnect();

  useEffect(() => {
    prepareMonitoringIntegrations();
    const db = tryGetFirestoreDb();
    if (!db) return;
    void enableFirestoreOfflinePersistence(db).then(setPersistence);
  }, [setPersistence]);

  return null;
}
