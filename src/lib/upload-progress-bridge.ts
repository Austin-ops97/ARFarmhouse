"use client";

import { startTransition } from "react";

/**
 * Coalesces rapid Firebase/storage progress callbacks to at most one React update per animation frame,
 * keeping scroll/taps responsive during uploads. While the tab is hidden (`visibilitychange`), uses a
 * microtask flush so progress does not stall until the next foreground frame.
 */
export function createRafProgressBridge<T>(emit: (payload: T) => void): (payload: T) => void {
  let scheduled = false;
  let pending: T | undefined;

  const flush = () => {
    scheduled = false;
    const latest = pending;
    pending = undefined;
    if (latest === undefined) return;
    startTransition(() => emit(latest));
  };

  return (payload: T) => {
    pending = payload;
    if (scheduled) return;
    scheduled = true;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      queueMicrotask(flush);
    } else {
      window.requestAnimationFrame(flush);
    }
  };
}
