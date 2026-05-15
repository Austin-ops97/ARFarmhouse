/** Max bytes per image before publish is rejected client-side (under Storage rule 12MB). */
export const FEED_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export function validateFeedImageFiles(files: File[]): void {
  if (files.length > 6) throw new Error("You can attach up to 6 images per post.");
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error(`"${file.name}" is not a supported image.`);
    }
    if (file.size > FEED_IMAGE_MAX_BYTES) {
      throw new Error(`"${file.name}" is too large. Keep each image under 10 MB.`);
    }
  }
}
