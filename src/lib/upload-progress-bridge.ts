"use client";

import { startTransition } from "react";

/**
 * Coalesces rapid Firebase/storage progress callbacks to at most one React update per animation frame,
 * keeping scroll/taps responsive during uploads.
 */
export function createRafProgressBridge<T>(emit: (payload: T) => void): (payload: T) => void {
  let raf = 0;
  let pending: T | undefined;

  return (payload: T) => {
    pending = payload;
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      const latest = pending;
      pending = undefined;
      if (latest === undefined) return;
      startTransition(() => emit(latest));
    });
  };
}
