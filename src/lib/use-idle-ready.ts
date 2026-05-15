"use client";

import { useEffect, useState } from "react";

/**
 * Becomes true after the browser is idle (or after `timeoutMs`), so heavy work can
 * run after first paint without blocking interaction.
 */
export function useIdleReady(timeoutMs = 1800): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    const markReady = () => setReady(true);

    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(markReady, { timeout: timeoutMs });
      return () => cancelIdleCallback(id);
    }

    const t = window.setTimeout(markReady, Math.min(timeoutMs, 48));
    return () => window.clearTimeout(t);
  }, [ready, timeoutMs]);

  return ready;
}
