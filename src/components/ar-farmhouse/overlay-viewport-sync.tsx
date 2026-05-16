"use client";

import { useOverlayViewportInsets } from "@/hooks/use-overlay-viewport-insets";

/** Mount once app-wide so overlay safe-area tokens track mobile browser chrome. */
export function OverlayViewportSync() {
  useOverlayViewportInsets();
  return null;
}
