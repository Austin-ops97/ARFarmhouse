"use client";

import { useRef } from "react";

import {
  feedMediaStableBoxStyle,
  resolveAlbumCarouselAspect,
  resolveFeedAspectRatio,
  type FeedMediaDims,
} from "@/lib/feed-media-aspect";

export type LockedFeedMediaBoxStyle = {
  aspectRatio: string;
  maxHeight: string;
};

export type LockedFeedMediaLayout = {
  boxStyle: LockedFeedMediaBoxStyle;
  /** Dims used for intrinsic `width`/`height` on Next/Image — frozen at first paint. */
  layoutDims: FeedMediaDims;
};

/** Snapshot once — avoids iOS Safari address-bar resize churn while scrolling. */
function snapshotViewportHeightPx(): number {
  if (typeof window === "undefined") return 812;
  const vv = window.visualViewport?.height;
  return Math.round(typeof vv === "number" && vv > 0 ? vv : window.innerHeight);
}

function syntheticDimsFromAspect(aspect: number): FeedMediaDims {
  const height = 1000;
  return { width: Math.max(1, Math.round(aspect * height)), height };
}

function lockLayout(dims: FeedMediaDims | null | undefined): LockedFeedMediaLayout {
  const vhPx = snapshotViewportHeightPx();
  const boxStyle = feedMediaStableBoxStyle(dims, vhPx);
  const layoutDims =
    dims && dims.width > 0 && dims.height > 0 ? dims : syntheticDimsFromAspect(resolveFeedAspectRatio(dims));
  return { boxStyle, layoutDims };
}

/**
 * Locks feed media aspect ratio + max-height at first paint.
 * Ignores later dim probes, Firestore updates, and viewport resize (scroll CLS).
 */
export function useLockedFeedMediaLayout(dims?: FeedMediaDims | null): LockedFeedMediaLayout {
  const lockRef = useRef<LockedFeedMediaLayout | null>(null);
  if (lockRef.current === null) {
    lockRef.current = lockLayout(dims);
  }
  return lockRef.current;
}

/** Mobile album carousel — one stable box for every slide. */
export function useLockedAlbumCarouselLayout(
  dimensions: (FeedMediaDims | null | undefined)[],
  count: number
): LockedFeedMediaLayout {
  const lockRef = useRef<LockedFeedMediaLayout | null>(null);
  if (lockRef.current === null) {
    const aspect = resolveAlbumCarouselAspect(dimensions, count);
    lockRef.current = lockLayout(syntheticDimsFromAspect(aspect));
  }
  return lockRef.current;
}
