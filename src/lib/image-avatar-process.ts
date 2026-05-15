import type { Area } from "react-easy-crop";

/** Square avatar output edge length in pixels. */
export const AVATAR_OUTPUT_SIZE = 512;

/** Default encoder quality (WebP / JPEG). */
export const AVATAR_QUALITY = 0.82;

/** Target max bytes after compression — retries lower quality if exceeded. */
export const AVATAR_TARGET_MAX_BYTES = 700 * 1024;

/** Hard cap for optimized avatar uploads (must match Storage rules). */
export const AVATAR_UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

export type AvatarCropPixels = Pick<Area, "x" | "y" | "width" | "height">;

export type ProcessedAvatar = {
  file: File;
  blob: Blob;
  mime: string;
  width: number;
  height: number;
};

import {
  isWebPEncodeSupported,
  outputExtension,
  preferredOutputMime,
} from "@/lib/image-process";

export { isWebPEncodeSupported };

export function preferredAvatarMime(): "image/webp" | "image/jpeg" {
  return preferredOutputMime();
}

export function avatarFileExtension(mime: string): string {
  return outputExtension(mime);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => reject(new Error("Could not load that image. Try another photo.")));
    img.crossOrigin = "anonymous";
    img.src = src;
  });
}

function getRotatedSize(width: number, height: number, rotation: number) {
  const rot = ((rotation % 360) + 360) % 360;
  if (rot === 90 || rot === 270) {
    return { width: height, height: width };
  }
  return { width, height };
}

const TO_RADIANS = Math.PI / 180;

/**
 * Renders a cropped region (from react-easy-crop pixel area) to a square avatar blob.
 * Reusable for profile, family member, and pet photos.
 */
export async function renderCroppedAvatarBlob(
  imageSrc: string,
  crop: AvatarCropPixels,
  rotation = 0,
  mime = preferredAvatarMime(),
  quality = AVATAR_QUALITY
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const { width: bW, height: bH } = getRotatedSize(image.width, image.height, rotation);

  const scratch = document.createElement("canvas");
  scratch.width = bW;
  scratch.height = bH;
  const sctx = scratch.getContext("2d");
  if (!sctx) throw new Error("Could not process image on this device.");

  sctx.translate(bW / 2, bH / 2);
  sctx.rotate(rotation * TO_RADIANS);
  sctx.translate(-image.width / 2, -image.height / 2);
  sctx.drawImage(image, 0, 0);

  const out = document.createElement("canvas");
  out.width = AVATAR_OUTPUT_SIZE;
  out.height = AVATAR_OUTPUT_SIZE;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Could not process image on this device.");

  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(
    scratch,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE
  );

  const blob = await canvasToBlob(out, mime, quality);
  if (!blob) throw new Error("Could not compress that photo. Try a different image.");
  return blob;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}

async function compressAvatarBlob(initial: Blob, mime: string): Promise<Blob> {
  if (initial.size <= AVATAR_TARGET_MAX_BYTES) return initial;

  const objectUrl = URL.createObjectURL(initial);
  let img: HTMLImageElement;
  try {
    img = await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return initial;
  }
  ctx.drawImage(img, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);

  let q = AVATAR_QUALITY;
  let blob: Blob | null = initial;
  while (q >= 0.5) {
    blob = await canvasToBlob(canvas, mime, q);
    if (!blob) break;
    if (blob.size <= AVATAR_TARGET_MAX_BYTES) return blob;
    q -= 0.08;
  }
  return blob ?? initial;
}

export async function processAvatarFromCrop(
  imageSrc: string,
  crop: AvatarCropPixels,
  rotation = 0
): Promise<ProcessedAvatar> {
  const mime = preferredAvatarMime();
  let blob = await renderCroppedAvatarBlob(imageSrc, crop, rotation, mime, AVATAR_QUALITY);
  blob = await compressAvatarBlob(blob, mime);

  if (blob.size > AVATAR_UPLOAD_MAX_BYTES) {
    throw new Error("That photo is still too large after compression. Try a simpler image or crop tighter.");
  }

  const ext = avatarFileExtension(mime);
  const file = new File([blob], `avatar.${ext}`, { type: mime, lastModified: Date.now() });

  return {
    file,
    blob,
    mime,
    width: AVATAR_OUTPUT_SIZE,
    height: AVATAR_OUTPUT_SIZE,
  };
}

export function validateProcessedAvatar(blob: Blob | null | undefined): asserts blob is Blob {
  if (!blob || blob.size === 0) {
    throw new Error("Could not prepare your photo. Try again.");
  }
  if (blob.size > AVATAR_UPLOAD_MAX_BYTES) {
    throw new Error("Optimized photo exceeds the upload limit. Try cropping tighter.");
  }
}
