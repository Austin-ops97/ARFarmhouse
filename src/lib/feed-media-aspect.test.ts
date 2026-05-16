import { describe, expect, it } from "vitest";

import {
  computeFeedMediaDisplaySize,
  feedMediaImageFitClass,
  feedMediaStableBoxStyle,
  mediaOrientation,
  resolveAlbumCarouselAspect,
  resolveFeedAspectRatio,
  viewportMaxFeedMediaHeight,
} from "@/lib/feed-media-aspect";

describe("feed-media-aspect", () => {
  it("classifies orientations from aspect ratio", () => {
    expect(mediaOrientation(900, 1600)).toBe("portrait");
    expect(mediaOrientation(1200, 1200)).toBe("square");
    expect(mediaOrientation(1600, 900)).toBe("landscape");
    expect(mediaOrientation(3000, 800)).toBe("panorama");
  });

  it("caps portrait height then shrinks width", () => {
    const { widthPx, heightPx } = computeFeedMediaDisplaySize({
      containerWidthPx: 400,
      naturalWidth: 900,
      naturalHeight: 1600,
      maxHeightPx: 400,
    });
    expect(heightPx).toBe(400);
    expect(widthPx).toBe(225);
  });

  it("uses full stream width for landscape when under max height", () => {
    const { widthPx, heightPx } = computeFeedMediaDisplaySize({
      containerWidthPx: 500,
      naturalWidth: 1600,
      naturalHeight: 900,
      maxHeightPx: 540,
    });
    expect(widthPx).toBe(500);
    expect(heightPx).toBe(281);
  });

  it("panorama max height is shorter than portrait but taller than legacy banner cap", () => {
    const vh = 800;
    const portrait = viewportMaxFeedMediaHeight("portrait", vh);
    const panorama = viewportMaxFeedMediaHeight("panorama", vh);
    expect(panorama).toBeLessThan(portrait);
    expect(panorama).toBeGreaterThan(300);
  });

  it("uses fallback aspect when dims missing", () => {
    expect(resolveFeedAspectRatio(null)).toBe(0.8);
  });

  it("builds stable box style from metadata only", () => {
    const style = feedMediaStableBoxStyle({ width: 900, height: 1600 }, 800);
    expect(style.aspectRatio).toBe(String(900 / 1600));
    expect(style.maxHeight).toMatch(/px$/);
  });

  it("locks album carousel to geometric mean of known aspects", () => {
    const aspect = resolveAlbumCarouselAspect(
      [{ width: 900, height: 1600 }, { width: 1600, height: 900 }],
      2
    );
    expect(aspect).toBeCloseTo(1);
  });

  it("uses contain for embedded shells and cover when metadata-sized", () => {
    expect(feedMediaImageFitClass({ width: 1600, height: 900 }, "embedded")).toContain("object-contain");
    expect(feedMediaImageFitClass({ width: 1600, height: 900 }, "standalone")).toContain("object-cover");
    expect(feedMediaImageFitClass(null, "standalone")).toContain("object-contain");
  });

  it("narrows portrait box width when height is capped", () => {
    const style = feedMediaStableBoxStyle({ width: 900, height: 1600 }, 800, 400);
    expect(style.maxWidth).toBe("315px");
  });
});
