import { describe, expect, it } from "vitest";

import {
  dimensionsForLongestEdge,
  jpegOrientedDimensionsFromStoredAndExif,
} from "@/lib/image-dimensions";

describe("dimensionsForLongestEdge", () => {
  it("scales down from longest edge without changing aspect ratio", () => {
    expect(dimensionsForLongestEdge(4032, 3024, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(dimensionsForLongestEdge(3024, 4032, 2000)).toEqual({ width: 1500, height: 2000 });
  });

  it("never upscales when source fits within maxEdge", () => {
    expect(dimensionsForLongestEdge(800, 600, 2000)).toEqual({ width: 800, height: 600 });
  });
});

describe("jpegOrientedDimensionsFromStoredAndExif", () => {
  it("swaps dimensions for transpose orientations (5–8)", () => {
    expect(jpegOrientedDimensionsFromStoredAndExif(4032, 3024, 6)).toEqual({ width: 3024, height: 4032 });
    expect(jpegOrientedDimensionsFromStoredAndExif(4032, 3024, 8)).toEqual({ width: 3024, height: 4032 });
    expect(jpegOrientedDimensionsFromStoredAndExif(4032, 3024, 5)).toEqual({ width: 3024, height: 4032 });
  });

  it("leaves dimensions for non-transpose orientations", () => {
    expect(jpegOrientedDimensionsFromStoredAndExif(4032, 3024, 1)).toEqual({ width: 4032, height: 3024 });
    expect(jpegOrientedDimensionsFromStoredAndExif(4032, 3024, 3)).toEqual({ width: 4032, height: 3024 });
    expect(jpegOrientedDimensionsFromStoredAndExif(4032, 3024, null)).toEqual({ width: 4032, height: 3024 });
  });
});
