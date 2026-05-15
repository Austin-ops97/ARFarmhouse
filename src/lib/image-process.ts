import { validateRawImageFile } from "@/lib/image-input";

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
 * Social-style presets: HD-first, size reduction second.
 * Inspired by Facebook/Instagram — sharp feed photos, richer album archives.
 */
export const IMAGE_PRESETS: Record<ImageUploadPreset, ImagePresetConfig> = {
  feed: {
    maxEdge: 2048,
    quality: 0.88,
    minQuality: 0.78,
    softTargetBytes: 2 * 1024 * 1024,
    uploadMaxBytes: 5 * 1024 * 1024,
  },
  album: {
    maxEdge: 3000,
    quality: 0.9,
    minQuality: 0.8,
    softTargetBytes: 4 * 1024 * 1024,
    uploadMaxBytes: 8 * 1024 * 1024,
  },
  family: {
    maxEdge: 768,
    quality: 0.86,
    minQuality: 0.72,
    softTargetBytes: 700 * 1024,
    uploadMaxBytes: 2 * 1024 * 1024,
  },
  pet: {
    maxEdge: 768,
    quality: 0.86,
    minQuality: 0.72,
    softTargetBytes: 700 * 1024,
    uploadMaxBytes: 2 * 1024 * 1024,
  },
};

export type ProcessedImageFile = {
  file: File;
  width: number;
  height: number;
  originalSize: number;
  outputSize: number;
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
            "Could not read that photo. If it is HEIC, try again in Safari or save as JPEG in Photos first."
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

type DecodedImage = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  dispose: () => void;
};

async function decodeImageFile(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return {
        width: bmp.width,
        height: bmp.height,
        draw: (ctx, w, h) => {
          ctx.drawImage(bmp, 0, 0, w, h);
        },
        dispose: () => bmp.close(),
      };
    } catch {
      /* fall through to Image() — some HEIC / older browsers */
    }
  }

  const { img, revoke } = await loadImageElement(file);
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    draw: (ctx, w, h) => {
      ctx.drawImage(img, 0, 0, w, h);
    },
    dispose: revoke,
  };
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

/**
 * Skip canvas work when the source is already web-ready at HD quality.
 */
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

  // Already a well-sized JPEG/WebP — keep pixels, skip re-encode.
  if (file.size <= config.softTargetBytes) return true;

  // Slightly over soft target but still within upload cap — still sharp enough.
  return file.size <= config.softTargetBytes * 1.35;
}

/**
 * Adaptive encode: start high quality, only step down when needed for upload limits.
 */
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
  if (blob.size <= uploadMaxBytes) {
    // Gently nudge size down without crushing quality (social-app style).
    let q = startQuality - 0.03;
    let best = blob;
    while (q >= minQuality) {
      const candidate = await canvasToBlob(canvas, mime, q);
      if (!candidate) break;
      if (candidate.size <= softTargetBytes) return candidate;
      if (candidate.size < best.size * 0.94) best = candidate;
      else break;
      q -= 0.03;
    }
    if (best.size <= uploadMaxBytes) return best;
    blob = best;
  }

  // Must fit Storage hard cap — step down in small increments, never below minQuality.
  let q = Math.max(minQuality, startQuality - 0.06);
  while (q >= minQuality) {
    const candidate = await canvasToBlob(canvas, mime, q);
    if (!candidate) break;
    blob = candidate;
    if (blob.size <= uploadMaxBytes) return blob;
    q -= 0.04;
  }

  if (blob.size > uploadMaxBytes) {
    throw new Error(
      "That photo is still too large after optimization. Try a simpler image or upload fewer photos at once."
    );
  }

  return blob;
}

function outputFileName(originalName: string, mime: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "photo";
  return `${base}.${outputExtension(mime)}`;
}

/**
 * Resize and compress a single image for upload. GIFs pass through unchanged.
 */
export async function processImageFile(
  file: File,
  preset: ImageUploadPreset
): Promise<ProcessedImageFile> {
  validateRawImageFile(file);

  const config = IMAGE_PRESETS[preset];

  if (file.type === "image/gif") {
    if (file.size > config.uploadMaxBytes) {
      throw new Error(`"${file.name}" is too large. Try a shorter GIF or smaller dimensions.`);
    }
    return {
      file,
      width: 0,
      height: 0,
      originalSize: file.size,
      outputSize: file.size,
      skippedOptimization: true,
    };
  }

  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name)) {
    throw new Error(`"${file.name}" is not a supported image.`);
  }

  const decoded = await decodeImageFile(file);
  try {
    const { width: srcW, height: srcH } = decoded;
    if (srcW === 0 || srcH === 0) {
      throw new Error("That photo appears corrupted or empty. Try another.");
    }

    const longest = Math.max(srcW, srcH);
    const scale = Math.min(1, config.maxEdge / longest);
    const needsResize = scale < 1;
    const outW = Math.max(1, Math.round(srcW * scale));
    const outH = Math.max(1, Math.round(srcH * scale));

    if (canPassThroughOriginal(file, srcW, srcH, config, needsResize)) {
      return {
        file,
        width: srcW,
        height: srcH,
        originalSize: file.size,
        outputSize: file.size,
        skippedOptimization: true,
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not process image on this device.");
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    decoded.draw(ctx, outW, outH);

    const mime = preferredOutputMime();
    const blob = await encodeAdaptive(canvas, mime, config);
    releaseCanvas(canvas);

    const outFile = new File([blob], outputFileName(file.name, mime), {
      type: mime,
      lastModified: file.lastModified,
    });

    return {
      file: outFile,
      width: outW,
      height: outH,
      originalSize: file.size,
      outputSize: outFile.size,
      skippedOptimization: false,
    };
  } finally {
    decoded.dispose();
  }
}

export async function processImageFiles(
  files: File[],
  preset: ImageUploadPreset,
  onProgress?: (progress: ProcessImagesProgress) => void
): Promise<File[]> {
  const total = files.length;
  const out: File[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    onProgress?.({ done: i, total, fileName: file.name });
    const processed = await processImageFile(file, preset);
    out.push(processed.file);
    onProgress?.({ done: i + 1, total, fileName: file.name });
  }

  return out;
}

export function getUploadMaxBytes(preset: ImageUploadPreset): number {
  return IMAGE_PRESETS[preset].uploadMaxBytes;
}

/** @deprecated Use softTargetBytes on IMAGE_PRESETS */
export function getSoftTargetBytes(preset: ImageUploadPreset): number {
  return IMAGE_PRESETS[preset].softTargetBytes;
}
