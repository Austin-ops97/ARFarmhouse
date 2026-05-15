import { describe, expect, it } from "vitest";

import { IMAGE_PRESETS, getUploadMaxBytes, outputExtension, preferredOutputMime } from "@/lib/image-process";

describe("image-process presets", () => {
  it("feed preset targets mobile-friendly sizes", () => {
    expect(IMAGE_PRESETS.feed.maxEdge).toBe(1800);
    expect(IMAGE_PRESETS.feed.uploadMaxBytes).toBe(5 * 1024 * 1024);
    expect(IMAGE_PRESETS.feed.targetMaxBytes).toBeLessThanOrEqual(2 * 1024 * 1024);
  });

  it("album preset allows higher quality than feed", () => {
    expect(IMAGE_PRESETS.album.maxEdge).toBeGreaterThan(IMAGE_PRESETS.feed.maxEdge);
    expect(IMAGE_PRESETS.album.uploadMaxBytes).toBe(8 * 1024 * 1024);
  });

  it("family and pet presets share portrait limits", () => {
    expect(IMAGE_PRESETS.family.maxEdge).toBe(768);
    expect(IMAGE_PRESETS.pet.maxEdge).toBe(768);
    expect(getUploadMaxBytes("family")).toBe(2 * 1024 * 1024);
  });

  it("prefers webp or jpeg extension", () => {
    const mime = preferredOutputMime();
    expect(["image/webp", "image/jpeg"]).toContain(mime);
    expect(outputExtension(mime)).toMatch(/^(webp|jpg)$/);
  });
});
