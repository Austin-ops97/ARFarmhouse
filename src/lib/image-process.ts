import { dimensionsForLongestEdge, probeImageDimensions } from "@/lib/image-dimensions";
import { shrinkResizeTargetUniform } from "@/lib/image-resize";
import { validateRawImageFile } from "@/lib/image-input";
import {
  imageProcessingConcurrency,
  mapWithConcurrency,
  yieldToMainThread,
  yieldWhenIdle,
} from "@/lib/image-scheduler";

export type ImageUploadPreset = "feed" | "album" | "family" | "pet";

export type ImagePresetConfig = {
  /** Longest edge cap — never upscale beyond source. */
  maxEdge: number;
  /** Initial encoder quality (WebP / JPEG). */
  quality: number;
  /** Floor quality — avoids visible banding from over-compression. */
  minQuality: number;
  /** Preferred output size; we accept larger files when quality would suffer. */
  softTargetBytes: number;
  /** Hard cap after processing (must align with Storage rules). */
  uploadMaxBytes: number;
};

/**
 * Social-style presets: HD-first, bandwidth second.
 */
export const IMAGE_PRESETS: Record<ImageUploadPreset, ImagePresetConfig> = {
  feed: {
    maxEdge: 2000,
    quality: 0.86,
    minQuality: 0.78,
    softTargetBytes: 1800 * 1024,
    uploadMaxBytes: 5 * 1024 * 1024,
  },
  album: {
    maxEdge: 3200,
    quality: 0.9,
    minQuality: 0.82,
    softTargetBytes: 5 * 1024 * 1024,
    uploadMaxBytes: 8 * 1024 * 1024,
  },
  family: {
    maxEdge: 720,
    quality: 0.84,
    minQuality: 0.72,
    softTargetBytes: 380 * 1024,
    uploadMaxBytes: 2 * 1024 * 1024,
  },
  pet: {
    maxEdge: 720,
    quality: 0.84,
    minQuality: 0.72,
    softTargetBytes: 380 * 1024,
    uploadMaxBytes: 2 * 1024 * 1024,
  },
};

export type ProcessedImageFile = {
  file: File;
  width: number;
  height: number;
  originalSize: number;
  /** MIME from the picker before optimization (never uploaded raw). */
  originalMime: string;
  optimizedSizeBytes: number;
  skippedOptimization: boolean;
};

export type ProcessImagesProgress = {
  done: number;
  total: number;
  fileName?: string;
};

let webpEncodeSupported: boolean | null = null;

export function isWebPEncodeSupported(): boolean {
  if (typeof document === "undefined") return false;
  if (webpEncodeSupported !== null) return webpEncodeSupported;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  webpEncodeSupported = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return webpEncodeSupported;
}

export function preferredOutputMime(): "image/webp" | "image/jpeg" {
  return isWebPEncodeSupported() ? "image/webp" : "image/jpeg";
}

export function outputExtension(mime: string): string {
  return mime === "image/webp" ? "webp" : "jpg";
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}

function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

async function loadImageElement(file: File): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(
          new Error(
            "Could not read that photo. If it is HEIC, try Safari or convert to JPEG in Photos first."
          )
        );
      el.src = url;
    });
    return { img, revoke: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

const LOSSY_OUTPUT = new Set(["image/jpeg", "image/webp"]);

function mustTranscodeMime(mime: string, fileName: string): boolean {
  if (!mime) return /\.(heic|heif|png|avif)$/i.test(fileName);
  return (
    mime === "image/heic" ||
    mime === "image/heif" ||
    mime === "image/png" ||
    mime === "image/avif" ||
    mime === "image/bmp"
  );
}

function canPassThroughOriginal(
  file: File,
  srcW: number,
  srcH: number,
  config: ImagePresetConfig,
  needsResize: boolean
): boolean {
  if (needsResize) return false;
  if (file.size > config.uploadMaxBytes) return false;
  if (mustTranscodeMime(file.type, file.name)) return false;
  if (!LOSSY_OUTPUT.has(file.type)) return false;

  const longest = Math.max(srcW, srcH);
  if (longest > config.maxEdge) return false;

  if (file.size <= config.softTargetBytes) return true;

  return file.size <= config.softTargetBytes * 1.35;
}

const MAX_ENCODE_ATTEMPTS = 6;

async function encodeAdaptive(
  canvas: HTMLCanvasElement,
  mime: string,
  config: ImagePresetConfig
): Promise<Blob> {
  const { quality: startQuality, minQuality, softTargetBytes, uploadMaxBytes } = config;

  let blob = await canvasToBlob(canvas, mime, startQuality);
  if (!blob) {
    throw new Error("Could not compress that photo. Try a different image.");
  }

  if (blob.size <= softTargetBytes) return blob;

  let best = blob;
  let q = startQuality;
  let attempts = 1;

  while (attempts < MAX_ENCODE_ATTEMPTS && q > minQuality) {
    await yieldWhenIdle();
    q = Math.max(minQuality, q - 0.04);
    attempts += 1;
    const candidate = await canvasToBlob(canvas, mime, q);
    if (!candidate) break;
    blob = candidate;
    if (blob.size < best.size) best = blob;
    if (blob.size <= softTargetBytes) return blob;
    if (blob.size <= uploadMaxBytes && attempts >= 3) return blob;
  }

  if (best.size <= uploadMaxBytes) return best;

  if (best.size > uploadMaxBytes) {
    throw new Error(
      "That photo is still too large after optimization. Try a simpler image or upload fewer photos at once."
    );
  }

  return best;
}

function outputFileName(originalName: string, mime: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "photo";
  return `${base}.${outputExtension(mime)}`;
}

type ResizeBitmapOpts = Omit<ImageBitmapOptions, "resizeWidth"> & {
  resizeWidth: number;
  resizeHeight: number;
};

/**
 * Decode + resize in one GPU-friendly step when supported (critical for giant iPhone photos).
 */
async function createResizedBitmap(file: File, rw: number, rh: number, qualityTier: number): Promise<ImageBitmap> {
  const resizeQuality = qualityTier <= 1 ? "high" : qualityTier <= 3 ? "medium" : "low";
  const opts: ResizeBitmapOpts = {
    resizeWidth: rw,
    resizeHeight: rh,
    resizeQuality,
    imageOrientation: "from-image",
  };
  await yieldToMainThread();
  const bmp = await createImageBitmap(file, opts as ImageBitmapOptions);
  return bmp;
}

/** Decrementally shrink resize box on decode failure / memory pressure. */
async function decodeBitmapWithBackoff(file: File, targetW: number, targetH: number): Promise<ImageBitmap> {
  let w = Math.max(1, targetW);
  let h = Math.max(1, targetH);
  let lastErr: unknown;

  for (let tier = 0; tier < 8; tier++) {
    await yieldWhenIdle();
    try {
      return await createResizedBitmap(file, w, h, tier);
    } catch (e) {
      lastErr = e;
      const next = shrinkResizeTargetUniform(w, h, 0.68, 240);
      w = next.width;
      h = next.height;
      if (w <= 260 && h <= 260 && tier >= 4) break;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error("Could not decode that photo on this device. Try a smaller JPEG or convert HEIC in Photos.");
}

/**
 * Last-resort path: Image() decode then draw into a canvas capped by {@link ImagePresetConfig.maxEdge}.
 * Can spike RAM on enormous HEIF — prefer {@link decodeBitmapWithBackoff} when it succeeds.
 */
async function decodeViaCanvasDownscale(
  file: File,
  config: ImagePresetConfig
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const { img, revoke } = await loadImageElement(file);
  try {
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    if (srcW === 0 || srcH === 0) {
      throw new Error("That photo appears corrupted or empty. Try another.");
    }
    const { width: outW, height: outH } = dimensionsForLongestEdge(srcW, srcH, config.maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image on this device.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    await yieldWhenIdle();
    ctx.drawImage(img, 0, 0, outW, outH);
    return { canvas, width: outW, height: outH };
  } finally {
    revoke();
  }
}

async function bitmapToEncodeCanvas(bitmap: ImageBitmap): Promise<{
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}> {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not process image on this device.");
  }
  await yieldWhenIdle();
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { canvas, width: canvas.width, height: canvas.height };
}

/**
 * Resize and compress for Firebase. GIFs pass through unchanged.
 */
export async function processImageFile(file: File, preset: ImageUploadPreset): Promise<ProcessedImageFile> {
  validateRawImageFile(file);
  const config = IMAGE_PRESETS[preset];
  const originalMime = file.type || "application/octet-stream";

  if (file.type === "image/gif") {
    if (file.size > config.uploadMaxBytes) {
      throw new Error(`"${file.name}" is too large. Try a shorter GIF or smaller dimensions.`);
    }
    return {
      file,
      width: 0,
      height: 0,
      originalSize: file.size,
      originalMime,
      optimizedSizeBytes: file.size,
      skippedOptimization: true,
    };
  }

  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name)) {
    throw new Error(`"${file.name}" is not a supported image.`);
  }

  await yieldWhenIdle();
  const probed = await probeImageDimensions(file);
  await yieldWhenIdle();

  /** Without trusted WxH, never pass resizeWidth+resizeHeight into createImageBitmap — a square fallback distorts non‑square sources (common when probes miss HEIC/HDR). Canvas/Image fallback derives oriented natural dimensions instead. */
  let bitmapResizeTarget: { width: number; height: number } | null = null;

  if (probed && probed.width > 0 && probed.height > 0) {
    const longest = Math.max(probed.width, probed.height);
    const needsResize = longest > config.maxEdge;
    if (canPassThroughOriginal(file, probed.width, probed.height, config, needsResize)) {
      return {
        file,
        width: probed.width,
        height: probed.height,
        originalSize: file.size,
        originalMime,
        optimizedSizeBytes: file.size,
        skippedOptimization: true,
      };
    }
    bitmapResizeTarget = dimensionsForLongestEdge(probed.width, probed.height, config.maxEdge);
  }

  async function finalize(canvas: HTMLCanvasElement, width: number, height: number): Promise<ProcessedImageFile> {
    try {
      await yieldWhenIdle();
      const mime = preferredOutputMime();
      const blob = await encodeAdaptive(canvas, mime, config);
      const outFile = new File([blob], outputFileName(file.name, mime), {
        type: mime,
        lastModified: file.lastModified,
      });
      return {
        file: outFile,
        width,
        height,
        originalSize: file.size,
        originalMime,
        optimizedSizeBytes: outFile.size,
        skippedOptimization: false,
      };
    } finally {
      releaseCanvas(canvas);
    }
  }

  if (typeof createImageBitmap === "function" && bitmapResizeTarget) {
    try {
      const bmp = await decodeBitmapWithBackoff(file, bitmapResizeTarget.width, bitmapResizeTarget.height);
      const { canvas, width, height } = await bitmapToEncodeCanvas(bmp);
      return finalize(canvas, width, height);
    } catch {
      /* fall through */
    }
  }

  const { canvas, width, height } = await decodeViaCanvasDownscale(file, config);
  return finalize(canvas, width, height);
}

export async function processImageFiles(
  files: File[],
  preset: ImageUploadPreset,
  onProgress?: (progress: ProcessImagesProgress) => void
): Promise<ProcessedImageFile[]> {
  const total = files.length;
  const concurrency = imageProcessingConcurrency();

  return mapWithConcurrency(files, concurrency, async (file, i) => {
    onProgress?.({ done: i, total, fileName: file.name });
    const result = await processImageFile(file, preset);
    onProgress?.({ done: i + 1, total, fileName: file.name });
    return result;
  });
}

export function getUploadMaxBytes(preset: ImageUploadPreset): number {
  return IMAGE_PRESETS[preset].uploadMaxBytes;
}

/** @deprecated Use softTargetBytes on IMAGE_PRESETS */
export function getSoftTargetBytes(preset: ImageUploadPreset): number {
  return IMAGE_PRESETS[preset].softTargetBytes;
}