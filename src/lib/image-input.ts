/** Max size for raw images before client-side crop/compress (profile picker, future album flows). */
export const RAW_IMAGE_MAX_BYTES = 25 * 1024 * 1024;

const ACCEPTED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
]);

const ACCEPTED_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i;

export function isAcceptedImageMime(mime: string): boolean {
  if (!mime) return false;
  if (ACCEPTED_MIME.has(mime)) return true;
  return mime.startsWith("image/");
}

export function validateRawImageFile(file: File): void {
  const mime = file.type || "";
  const nameOk = ACCEPTED_EXT.test(file.name);

  if (!mime.startsWith("image/") && !nameOk) {
    throw new Error(`"${file.name}" is not a supported image. Use JPEG, PNG, or WebP.`);
  }

  if (mime && !isAcceptedImageMime(mime) && !nameOk) {
    throw new Error(`"${file.name}" is not a supported image format.`);
  }

  if (file.size > RAW_IMAGE_MAX_BYTES) {
    throw new Error(
      `"${file.name}" is too large (${Math.round(file.size / (1024 * 1024))} MB). Choose a photo under 25 MB.`
    );
  }

  if (file.size === 0) {
    throw new Error(`"${file.name}" appears to be empty. Try another photo.`);
  }
}
