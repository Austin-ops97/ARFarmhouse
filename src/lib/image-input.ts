/**
 * Max size for raw camera-roll / phone photos before client-side optimization.
 * Large originals are accepted here, then compressed before Firebase upload.
 */
export const RAW_IMAGE_MAX_BYTES = 100 * 1024 * 1024;

/** Raw files above this show "Optimizing large photo…" during processing. */
export const LARGE_RAW_IMAGE_BYTES = 15 * 1024 * 1024;

export function rawImageLimitMb(): number {
  return Math.round(RAW_IMAGE_MAX_BYTES / (1024 * 1024));
}

export function isLargeRawImage(file: File): boolean {
  return file.size > LARGE_RAW_IMAGE_BYTES;
}

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

export function isImageFileName(name: string): boolean {
  return ACCEPTED_EXT.test(name);
}

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
      `"${file.name}" is too large (${Math.round(file.size / (1024 * 1024))} MB). Choose a photo under ${rawImageLimitMb()} MB.`
    );
  }

  if (file.size === 0) {
    throw new Error(`"${file.name}" appears to be empty. Try another photo.`);
  }
}
