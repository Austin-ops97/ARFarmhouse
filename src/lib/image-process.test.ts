import { describe, expect, it } from "vitest";

import { IMAGE_PRESETS, getUploadMaxBytes, outputExtension, preferredOutputMime } from "@/lib/image-process";

describe("image-process presets", () => {
  it("feed preset caps modest longest edge for lightweight uploads", () => {
    expect(IMAGE_PRESETS.feed.maxEdge).toBeGreaterThanOrEqual(2200);
    expect(IMAGE_PRESETS.feed.encodeQuality).toBeGreaterThanOrEqual(0.82);
    expect(IMAGE_PRESETS.feed.uploadMaxBytes).toBe(8 * 1024 * 1024);
  });

  it("album preset preserves slightly more headroom than feed", () => {
    expect(IMAGE_PRESETS.album.maxEdge).toBeGreaterThan(IMAGE_PRESETS.feed.maxEdge);
    expect(IMAGE_PRESETS.album.uploadMaxBytes).toBe(10 * 1024 * 1024);
  });

  it("family and pet presets stay avatar-sized", () => {
    expect(IMAGE_PRESETS.family.maxEdge).toBeLessThanOrEqual(900);
    expect(IMAGE_PRESETS.pet.maxEdge).toBeLessThanOrEqual(900);
    expect(getUploadMaxBytes("family")).toBe(1024 * 1024);
  });

  it("prefers webp or jpeg extension", () => {
    const mime = preferredOutputMime();
    expect(["image/webp", "image/jpeg"]).toContain(mime);
    expect(outputExtension(mime)).toMatch(/^(webp|jpg)$/);
  });
});
