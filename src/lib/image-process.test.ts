import { describe, expect, it } from "vitest";

import { IMAGE_PRESETS, getUploadMaxBytes, outputExtension, preferredOutputMime } from "@/lib/image-process";

const RAW_UPLOAD_CAP = 150 * 1024 * 1024;

describe("image-process presets", () => {
  it("feed preset allows large originals — Sharp pipeline owns optimization", () => {
    expect(IMAGE_PRESETS.feed.maxEdge).toBeGreaterThanOrEqual(8000);
    expect(IMAGE_PRESETS.feed.encodeQuality).toBeGreaterThanOrEqual(0.82);
    expect(IMAGE_PRESETS.feed.uploadMaxBytes).toBe(RAW_UPLOAD_CAP);
  });

  it("album preset matches feed envelope (same Storage raw cap)", () => {
    expect(IMAGE_PRESETS.album.maxEdge).toBeGreaterThanOrEqual(8000);
    expect(IMAGE_PRESETS.album.uploadMaxBytes).toBe(RAW_UPLOAD_CAP);
    expect(IMAGE_PRESETS.album.uploadMaxBytes).toBe(IMAGE_PRESETS.feed.uploadMaxBytes);
  });

  it("family and pet presets use the same raw upload envelope as feed", () => {
    expect(IMAGE_PRESETS.family.maxEdge).toBeGreaterThanOrEqual(8000);
    expect(IMAGE_PRESETS.pet.maxEdge).toBeGreaterThanOrEqual(8000);
    expect(getUploadMaxBytes("family")).toBe(RAW_UPLOAD_CAP);
    expect(getUploadMaxBytes("pet")).toBe(RAW_UPLOAD_CAP);
  });

  it("prefers webp or jpeg extension", () => {
    const mime = preferredOutputMime();
    expect(["image/webp", "image/jpeg"]).toContain(mime);
    expect(outputExtension(mime)).toMatch(/^(webp|jpg)$/);
  });
});
