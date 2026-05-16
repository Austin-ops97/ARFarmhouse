"use client";

import { useEffect } from "react";

/**
 * Tracks iOS Safari / mobile browser chrome so bottom sheets sit above the
 * visible viewport (not under the bottom toolbar). Sets `--ar-visual-bottom-inset`
 * on `<html>`; pair with `--ar-overlay-bottom` in globals.css.
 */
export function useOverlayViewportInsets() {
  useEffect(() => {
    const root = document.documentElement;

    const update = () => {
      const vv = window.visualViewport;
      if (!vv) {
        root.style.removeProperty("--ar-visual-bottom-inset");
        return;
      }
      const layoutBottom = window.innerHeight;
      const visualBottom = vv.offsetTop + vv.height;
      const inset = Math.max(0, Math.round(layoutBottom - visualBottom));
      root.style.setProperty("--ar-visual-bottom-inset", `${inset}px`);
    };

    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      root.style.removeProperty("--ar-visual-bottom-inset");
    };
  }, []);
}
