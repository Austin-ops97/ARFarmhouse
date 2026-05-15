"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Becomes true once the ref element intersects the viewport (for deferring subscriptions).
 */
export function useInViewReady(rootMargin = "200px 0px"): {
  ref: (node: HTMLElement | null) => void;
  inView: boolean;
} {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  const ref = useCallback((node: HTMLElement | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (inView || !element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [element, inView, rootMargin]);

  return { ref, inView };
}
