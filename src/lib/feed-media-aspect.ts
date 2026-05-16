/** Natural width / height for layout math (not CSS `aspect-ratio` order). */
export type FeedMediaDims = { width: number; height: number };

/** Locked fallback when Firestore/client dims are missing — never changes after mount. */
export const FEED_MEDIA_FALLBACK_ASPECT = 4 / 5;

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
      return Math.min(v * 0.64, 500);
    case "square":
      return Math.min(v * 0.68, 520);
    case "landscape":
      return Math.min(v * 0.7, 540);
    case "panorama":
      return Math.min(v * 0.42, 300);
    default:
      return Math.min(v * 0.66, 500);
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
  vhPx: number
): { aspectRatio: string; maxHeight: string } {
  const ratio = resolveFeedAspectRatio(dims);
  return {
    aspectRatio: String(ratio),
    maxHeight: `${feedMediaMaxHeightPx(dims, vhPx)}px`,
  };
}

/** Single aspect for mobile album carousel so slides do not resize when swiping. */
export function resolveAlbumCarouselAspect(
  dimensions: (FeedMediaDims | null | undefined)[],
  count: number
): number {
  for (let i = 0; i < count; i++) {
    const d = dimensions[i];
    if (d && d.width > 0 && d.height > 0) return d.width / d.height;
  }
  return FEED_MEDIA_FALLBACK_ASPECT;
}
