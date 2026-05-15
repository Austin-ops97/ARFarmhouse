import { describe, expect, it } from "vitest";

import {
  computeFeedMediaDisplaySize,
  mediaOrientation,
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

  it("panorama max height is stricter than landscape", () => {
    const vh = 800;
    const l = viewportMaxFeedMediaHeight("landscape", vh);
    const p = viewportMaxFeedMediaHeight("panorama", vh);
    expect(p).toBeLessThan(l);
  });
});
