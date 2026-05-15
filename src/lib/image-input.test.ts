import { describe, expect, it } from "vitest";

import { RAW_IMAGE_MAX_BYTES, validateRawImageFile } from "@/lib/image-input";

function mockFile(name: string, type: string, size: number): File {
  const file = new File([new Uint8Array(1)], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateRawImageFile", () => {
  it("accepts common image types under the raw limit", () => {
    expect(() => validateRawImageFile(mockFile("photo.jpg", "image/jpeg", 4_000_000))).not.toThrow();
    expect(() => validateRawImageFile(mockFile("photo.png", "image/png", 1_000))).not.toThrow();
  });

  it("rejects non-images", () => {
    expect(() => validateRawImageFile(mockFile("doc.pdf", "application/pdf", 1000))).toThrow(/not a supported image/);
  });

  it("rejects files over 25 MB", () => {
    expect(() =>
      validateRawImageFile(mockFile("huge.jpg", "image/jpeg", RAW_IMAGE_MAX_BYTES + 1))
    ).toThrow(/under 25 MB/);
  });
});
