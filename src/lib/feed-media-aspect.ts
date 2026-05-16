import type { CSSProperties } from "react";

import { FEED_STREAM_MAX_WIDTH_PX } from "@/lib/feed-layout";

/** Natural width / height for layout math (not CSS `aspect-ratio` order). */
export type FeedMediaDims = { width: number; height: number };

/** Locked fallback when Firestore/client dims are missing — never changes after mount. */
export const FEED_MEDIA_FALLBACK_ASPECT = 4 / 5;

/** Where the image is rendered — controls object-fit when the shell aspect may differ. */
export type FeedMediaRenderContext = "standalone" | "embedded";

export function mediaOrientation(
  nw: number,
  nh: number
): "portrait" | "square" | "landscape" | "panorama" {
  if (nw <= 0 || nh <= 0) return "landscape";
  const r = nw / nh;
  if (r < 0.9) return "portrait";
  if (r <= 1.11) return "square";
  if (r <= 2.25) return "landscape";
  return "panorama";
}

/** Max clip height (px) for in-feed media by orientation — tuned for mobile + ~520px stream. */
export function viewportMaxFeedMediaHeight(
  orientation: ReturnType<typeof mediaOrientation>,
  vhPx: number
): number {
  const v = Math.max(320, vhPx);
  switch (orientation) {
    case "portrait":
      return Math.min(v * 0.72, 560);
    case "square":
      return Math.min(v * 0.7, 540);
    case "landscape":
      return Math.min(v * 0.72, 560);
    case "panorama":
      return Math.min(v * 0.52, 380);
    default:
      return Math.min(v * 0.7, 540);
  }
}

/**
 * Size the media box to `containerWidth` wide when possible, but never exceed `maxHeightPx`.
 * Centers horizontally when width shrinks (portrait capped by height).
 */
export function computeFeedMediaDisplaySize(opts: {
  containerWidthPx: number;
  naturalWidth: number;
  naturalHeight: number;
  maxHeightPx: number;
  streamMaxWidthPx?: number;
}): { widthPx: number; heightPx: number } {
  const {
    containerWidthPx,
    naturalWidth: nw,
    naturalHeight: nh,
    maxHeightPx,
    streamMaxWidthPx = 520,
  } = opts;

  if (nw <= 0 || nh <= 0) {
    const w = Math.max(1, Math.min(containerWidthPx, streamMaxWidthPx));
    return { widthPx: w, heightPx: Math.max(1, Math.round(maxHeightPx * 0.55)) };
  }

  const cw = Math.max(1, Math.min(containerWidthPx, streamMaxWidthPx));
  const ar = nw / nh;
  let widthPx = cw;
  let heightPx = cw / ar;

  if (heightPx > maxHeightPx) {
    heightPx = maxHeightPx;
    widthPx = heightPx * ar;
  }

  return {
    widthPx: Math.max(1, Math.round(widthPx)),
    heightPx: Math.max(1, Math.round(heightPx)),
  };
}

/** Width÷height for CSS `aspect-ratio` — from metadata only (never from decode). */
export function resolveFeedAspectRatio(dims: FeedMediaDims | null | undefined): number {
  if (dims && dims.width > 0 && dims.height > 0) {
    return dims.width / dims.height;
  }
  return FEED_MEDIA_FALLBACK_ASPECT;
}

/** Max clip height for a feed slot from known dimensions and viewport. */
export function feedMediaMaxHeightPx(dims: FeedMediaDims | null | undefined, vhPx: number): number {
  if (dims && dims.width > 0 && dims.height > 0) {
    return viewportMaxFeedMediaHeight(mediaOrientation(dims.width, dims.height), vhPx);
  }
  return viewportMaxFeedMediaHeight("portrait", vhPx);
}

/**
 * Stable feed media box — aspect ratio and max-height are fixed at first paint.
 * Do not update from image decode or ResizeObserver (prevents scroll CLS).
 */
export function feedMediaStableBoxStyle(
  dims: FeedMediaDims | null | undefined,
  vhPx: number,
  containerWidthPx: number = FEED_STREAM_MAX_WIDTH_PX
): CSSProperties {
  const maxHeightPx = feedMediaMaxHeightPx(dims, vhPx);
  const ratio = resolveFeedAspectRatio(dims);

  const style: CSSProperties = {
    width: "100%",
    aspectRatio: String(ratio),
    maxHeight: `${maxHeightPx}px`,
  };

  if (dims && dims.width > 0 && dims.height > 0) {
    const { widthPx } = computeFeedMediaDisplaySize({
      containerWidthPx,
      naturalWidth: dims.width,
      naturalHeight: dims.height,
      maxHeightPx,
      streamMaxWidthPx: FEED_STREAM_MAX_WIDTH_PX,
    });
    if (widthPx < containerWidthPx - 1) {
      style.maxWidth = `${widthPx}px`;
    }
  }

  return style;
}

/**
 * Object-fit for feed previews — not global `object-contain`.
 * Standalone boxes are sized from metadata; embedded shells (carousel/grid) may differ.
 */
export function feedMediaImageFitClass(
  dims: FeedMediaDims | null | undefined,
  context: FeedMediaRenderContext
): string {
  if (context === "embedded") {
    return "object-contain object-center sm:object-cover sm:object-center";
  }
  const hasRealDims = Boolean(dims && dims.width > 0 && dims.height > 0);
  if (!hasRealDims) {
    return "object-contain object-center";
  }
  return "object-cover object-center";
}

/** Single aspect for mobile album carousel so slides do not resize when swiping. */
export function resolveAlbumCarouselAspect(
  dimensions: (FeedMediaDims | null | undefined)[],
  count: number
): number {
  const aspects: number[] = [];
  for (let i = 0; i < count; i++) {
    const d = dimensions[i];
    if (d && d.width > 0 && d.height > 0) aspects.push(d.width / d.height);
  }
  if (aspects.length === 0) return FEED_MEDIA_FALLBACK_ASPECT;
  if (aspects.length === 1) return aspects[0]!;
  const logSum = aspects.reduce((sum, aspect) => sum + Math.log(aspect), 0);
  return Math.exp(logSum / aspects.length);
}
