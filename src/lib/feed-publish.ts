import { validateRawImageFile } from "@/lib/image-input";
import { getUploadMaxBytes } from "@/lib/image-process";

/** Max bytes per optimized feed image (must match Storage rules). */
export const FEED_IMAGE_MAX_BYTES = getUploadMaxBytes("feed");

const MAX_FEED_ATTACHMENTS = 6;

/** Validates raw picks before client-side optimization (up to ~100 MB each). */
export function validateFeedImageFiles(files: File[]): void {
  if (files.length > MAX_FEED_ATTACHMENTS) {
    throw new Error("You can attach up to 6 images per post.");
  }
  for (const file of files) {
    validateRawImageFile(file);
  }
}

/** Validates files already optimized for upload. */
export function validateOptimizedFeedFiles(files: File[]): void {
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error(`"${file.name}" is not a supported image.`);
    }
    if (file.size > FEED_IMAGE_MAX_BYTES) {
      throw new Error(`"${file.name}" is still too large after optimization. Try fewer photos.`);
    }
  }
}
