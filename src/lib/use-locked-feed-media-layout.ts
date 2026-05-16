"use client";

import type { CSSProperties } from "react";
import { useRef } from "react";

import { FEED_STREAM_MAX_WIDTH_PX } from "@/lib/feed-layout";
import {
  feedMediaStableBoxStyle,
  resolveAlbumCarouselAspect,
  resolveFeedAspectRatio,
  type FeedMediaDims,
} from "@/lib/feed-media-aspect";

export type LockedFeedMediaLayout = {
  boxStyle: CSSProperties;
  /** Dims used for intrinsic `width`/`height` on Next/Image — frozen at first paint. */
  layoutDims: FeedMediaDims;
};

/** Snapshot once — avoids iOS Safari address-bar resize churn while scrolling. */
function snapshotViewportHeightPx(): number {
  if (typeof window === "undefined") return 812;
  const vv = window.visualViewport?.height;
  return Math.round(typeof vv === "number" && vv > 0 ? vv : window.innerHeight);
}

/** Snapshot stream width once — matches mobile feed column, not always 520px. */
function snapshotFeedContainerWidthPx(): number {
  if (typeof window === "undefined") return FEED_STREAM_MAX_WIDTH_PX;
  const inset = 32;
  return Math.max(280, Math.min(window.innerWidth - inset, FEED_STREAM_MAX_WIDTH_PX));
}

function hasRealFeedDims(dims: FeedMediaDims | null | undefined): dims is FeedMediaDims {
  return Boolean(dims && dims.width > 0 && dims.height > 0);
}

function syntheticDimsFromAspect(aspect: number): FeedMediaDims {
  const height = 1000;
  return { width: Math.max(1, Math.round(aspect * height)), height };
}

function lockLayout(dims: FeedMediaDims | null | undefined): LockedFeedMediaLayout {
  const vhPx = snapshotViewportHeightPx();
  const containerWidthPx = snapshotFeedContainerWidthPx();
  const boxStyle = feedMediaStableBoxStyle(dims, vhPx, containerWidthPx);
  const layoutDims = hasRealFeedDims(dims) ? dims : syntheticDimsFromAspect(resolveFeedAspectRatio(dims));
  return { boxStyle, layoutDims };
}

/**
 * Locks feed media aspect ratio + max-height at first paint.
 * Upgrades once when client/Firestore dims arrive after a fallback-only first paint.
 */
export function useLockedFeedMediaLayout(dims?: FeedMediaDims | null): LockedFeedMediaLayout {
  const lockRef = useRef<LockedFeedMediaLayout | null>(null);
  const lockedRealDimsRef = useRef(false);

  const realDims = hasRealFeedDims(dims);

  if (lockRef.current === null) {
    lockRef.current = lockLayout(dims);
    lockedRealDimsRef.current = realDims;
    return lockRef.current;
  }

  if (!lockedRealDimsRef.current && realDims) {
    lockRef.current = lockLayout(dims);
    lockedRealDimsRef.current = true;
  }

  return lockRef.current;
}

/** Mobile album carousel — one stable box for every slide. */
export function useLockedAlbumCarouselLayout(
  dimensions: (FeedMediaDims | null | undefined)[],
  count: number
): LockedFeedMediaLayout {
  const lockRef = useRef<LockedFeedMediaLayout | null>(null);
  const knownDimsRef = useRef(0);

  const known = dimensions.slice(0, count).filter((d) => hasRealFeedDims(d)).length;

  if (lockRef.current === null) {
    const aspect = resolveAlbumCarouselAspect(dimensions, count);
    lockRef.current = lockLayout(syntheticDimsFromAspect(aspect));
    knownDimsRef.current = known;
    return lockRef.current;
  }

  if (knownDimsRef.current === 0 && known > 0) {
    const aspect = resolveAlbumCarouselAspect(dimensions, count);
    lockRef.current = lockLayout(syntheticDimsFromAspect(aspect));
    knownDimsRef.current = known;
  }

  return lockRef.current;
}
