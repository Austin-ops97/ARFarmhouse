"use client";

import { useEffect, useState } from "react";

/** Browser online/offline signal for degraded-state UX (not Firebase reconnect). */
export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return { online, offline: !online };
}
