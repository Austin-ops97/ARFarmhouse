"use client";

import { useLayoutEffect } from "react";

let lockDepth = 0;
let savedScrollY = 0;

/**
 * Locks document scroll (iOS-safe) while overlays are open — background no longer
 * scrolls or rubber-bands under modals. Reference-counted for nested overlays.
 */
export function useBodyScrollLock(locked: boolean) {
  useLayoutEffect(() => {
    if (!locked || typeof document === "undefined") return;

    lockDepth += 1;
    if (lockDepth === 1) {
      savedScrollY = window.scrollY;
      document.documentElement.style.setProperty("--ar-scroll-lock-y", `${savedScrollY}px`);
      document.documentElement.classList.add("ar-scroll-lock");
    }

    return () => {
      lockDepth -= 1;
      if (lockDepth <= 0) {
        lockDepth = 0;
        document.documentElement.classList.remove("ar-scroll-lock");
        document.documentElement.style.removeProperty("--ar-scroll-lock-y");
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [locked]);
}
