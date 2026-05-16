import { dimensionsForLongestEdge, probeImageDimensions } from "@/lib/image-dimensions";
import { mobileUploadLog } from "@/lib/mobile-upload-debug";
import { shrinkResizeTargetUniform } from "@/lib/image-resize";
import { validateRawImageFile } from "@/lib/image-input";
import {
  imageProcessingConcurrency,
  mapWithConcurrency,
  yieldToMainThread,
  yieldWhenIdle,
} from "@/lib/image-scheduler";
import { promiseWithTimeout } from "@/lib/promise-timeout";
import { uploadLog, uploadStage } from "@/lib/upload-log";

export type ImageUploadPreset = "feed" | "album" | "family" | "pet";

/** Client presets: modest resize + one lightweight encode — heavy tuning happens in Cloud Functions (Sharp). */
export type ImagePresetConfig = {
  /** Longest edge cap — never upscale beyond source */
  maxEdge: number;
  /** Single-pass lossy encoder quality (WebP / JPEG) — no iterative recompression loops */
  encodeQuality: number;
  /** Hard cap after processing (must align with Storage rules) */
  uploadMaxBytes: number;
};

export const IMAGE_PRESETS: Record<ImageUploadPreset, ImagePresetConfig> = {
  feed: {
    maxEdge: 2480,
    encodeQuality: 0.87,
    uploadMaxBytes: 8 * 1024 * 1024,
  },
  album: {
    maxEdge: 2890,
    encodeQuality: 0.89,
    uploadMaxBytes: 10 * 1024 * 1024,
  },
  family: {
    maxEdge: 820,
    encodeQuality: 0.82,
    uploadMaxBytes: 1024 * 1024,
  },
  pet: {
    maxEdge: 820,
    encodeQuality: 0.82,
    uploadMaxBytes: 1024 * 1024,
  },
};

export type ProcessedImageFile = {
  file: File;
  width: number;
  height: number;
  originalSize: number;
  /** MIME from the picker before normalization (never upload raw HDR/PNG unbounded for lossy presets) */
  originalMime: string;
  normalizedSizeBytes: number;
  /** Alias for legacy callers / Firestore field names — same as {@link normalizedSizeBytes} */
  optimizedSizeBytes: number;
  skippedNormalization: boolean;
  /** Alias for skippedOptimization semantics */
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

const TO_BLOB_TIMEOUT_MS = 120_000;

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number, context: string): Promise<Blob | null> {
  const inner = new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), mime, quality);
    } catch (e) {
      uploadLog("canvas.toBlob threw", { context, message: e instanceof Error ? e.message : String(e) });
      resolve(null);
    }
  });
  return promiseWithTimeout(inner, TO_BLOB_TIMEOUT_MS, () => {
    uploadStage("stalled during blob generation — canvas.toBlob did not resolve", { context, mime, quality });
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
  return longest <= config.maxEdge;
}

async function encodeOnce(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number,
  uploadMaxBytes: number,
  context: string
): Promise<Blob> {
  uploadStage("normalization encode (single pass)", { mime, quality, context });
  const blob = await canvasToBlob(canvas, mime, quality, context);
  if (!blob) {
    throw new Error("Could not prepare that photo. Try a different image.");
  }
  if (blob.size > uploadMaxBytes) {
    const mb = Math.round(uploadMaxBytes / (1024 * 1024));
    throw new Error(
      `That photo exceeds the ~${mb} MB upload envelope after normalization. Try a simpler image or fewer photos — the server still optimizes it further.`
    );
  }
  return blob;
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
 * Decode + resize in one GPU-friendly step when supported (reduces peaks on giant camera photos).
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
 * Fallback: decode with Image(), draw into canvas capped by {@link ImagePresetConfig.maxEdge}.
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
    ctx.imageSmoothingQuality = "medium";
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

function buildProcessedArtifact(
  file: File,
  blob: Blob,
  width: number,
  height: number,
  mime: string,
  originalMime: string,
  originalSize: number,
  skippedNormalization: boolean
): ProcessedImageFile {
  const outFile = skippedNormalization
    ? file
    : new File([blob], outputFileName(file.name, mime), {
        type: mime,
        lastModified: file.lastModified,
      });
  const bytes = skippedNormalization ? file.size : blob.size;

  return {
    file: outFile,
    width,
    height,
    originalSize,
    originalMime,
    normalizedSizeBytes: bytes,
    optimizedSizeBytes: bytes,
    skippedNormalization,
    skippedOptimization: skippedNormalization,
  };
}

/**
 * Light orientation-aware resize + one encode — variants and aggressive compression happen server-side (Sharp).
 */
export async function processImageFile(file: File, preset: ImageUploadPreset): Promise<ProcessedImageFile> {
  validateRawImageFile(file);
  const config = IMAGE_PRESETS[preset];
  const originalMime = file.type || "application/octet-stream";
  uploadStage("normalization start", { name: file.name, bytes: file.size, preset });
  mobileUploadLog("light normalization pipeline start", { name: file.name, bytes: file.size, preset });

  if (file.type === "image/gif") {
    if (file.size > config.uploadMaxBytes) {
      throw new Error(`"${file.name}" is too large. Try a shorter GIF or smaller dimensions.`);
    }
    uploadStage("GIF pass-through — server does not GIF-reencode here", { name: file.name, bytes: file.size });
    const out = buildProcessedArtifact(file, file, 0, 0, "image/gif", originalMime, file.size, true);
    uploadStage("GIF ready", { name: file.name });
    return out;
  }

  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name)) {
    throw new Error(`"${file.name}" is not a supported image.`);
  }

  await yieldWhenIdle();
  const probed = await probeImageDimensions(file);
  await yieldWhenIdle();

  let bitmapResizeTarget: { width: number; height: number } | null = null;

  if (probed && probed.width > 0 && probed.height > 0) {
    const longest = Math.max(probed.width, probed.height);
    const needsResize = longest > config.maxEdge;
    if (canPassThroughOriginal(file, probed.width, probed.height, config, needsResize)) {
      uploadStage("normalization skipped (small lossy JPEG/WebP fits envelope)", {
        name: file.name,
        width: probed.width,
        height: probed.height,
      });
      const out = buildProcessedArtifact(file, file, probed.width, probed.height, file.type, originalMime, file.size, true);
      uploadStage("pass-through ready", { name: file.name });
      return out;
    }
    bitmapResizeTarget = dimensionsForLongestEdge(probed.width, probed.height, config.maxEdge);
  }

  async function finalizeNormalized(
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ): Promise<ProcessedImageFile> {
    try {
      await yieldWhenIdle();
      const mime = preferredOutputMime();
      const blob = await encodeOnce(canvas, mime, config.encodeQuality, config.uploadMaxBytes, "finalizeNormalized");
      uploadStage("blob generated", {
        name: file.name,
        mime,
        blobSize: blob.size,
        width,
        height,
      });
      mobileUploadLog("normalization complete", {
        name: file.name,
        blobBytes: blob.size,
        width,
        height,
      });
      const artifact = buildProcessedArtifact(file, blob, width, height, mime, originalMime, file.size, false);
      uploadStage("normalization complete", { name: file.name, outBytes: artifact.file.size });
      return artifact;
    } finally {
      releaseCanvas(canvas);
    }
  }

  if (typeof createImageBitmap === "function" && bitmapResizeTarget) {
    try {
      const bmp = await decodeBitmapWithBackoff(file, bitmapResizeTarget.width, bitmapResizeTarget.height);
      const { canvas, width, height } = await bitmapToEncodeCanvas(bmp);
      return finalizeNormalized(canvas, width, height);
    } catch {
      /* fall through */
    }
  }

  const { canvas, width, height } = await decodeViaCanvasDownscale(file, config);
  return finalizeNormalized(canvas, width, height);
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

/** @deprecated Rough guidance only — Sharp pipeline owns final encoded bytes */
export function getSoftTargetBytes(preset: ImageUploadPreset): number {
  const m = IMAGE_PRESETS[preset].uploadMaxBytes;
  return Math.floor(m * 0.42);
}
