"use client";

import { useEffect } from "react";

import { flushMutationQueue } from "@/platform/offline/mutation-queue";
import { trackEvent } from "@/platform/logging/monitoring";
import { useOfflineStore } from "@/platform/state/offline-store";

/**
 * Wires browser online/offline events to platform reconnect handling.
 */
export function useOfflineReconnect(): { online: boolean } {
  const setOnline = useOfflineStore((s) => s.setOnline);
  const online = useOfflineStore((s) => s.online);

  useEffect(() => {
    const sync = () => {
      const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      setOnline(isOnline);
      if (isOnline) {
        trackEvent("offline.reconnect");
        void flushMutationQueue();
      }
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, [setOnline]);

  return { online };
}
