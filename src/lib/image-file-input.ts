/** Broad accept list for mobile camera, HEIC (where supported), and gallery picks. */
export const IMAGE_FILE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/*";

/** Prefer rear camera on phones when the browser honors `capture`. */
export const MOBILE_CAMERA_CAPTURE = "environment" as const;
