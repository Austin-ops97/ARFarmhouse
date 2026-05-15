import { validateRawImageFile } from "@/lib/image-input";

export type ImageUploadPreset = "feed" | "album" | "family" | "pet";

export type ImagePresetConfig = {
  maxEdge: number;
  quality: number;
  /** Soft target — encoder retries with lower quality if exceeded. */
  targetMaxBytes: number;
  /** Hard cap after processing (must align with Storage rules). */
  uploadMaxBytes: number;
};

export const IMAGE_PRESETS: Record<ImageUploadPreset, ImagePresetConfig> = {
  feed: {
    maxEdge: 1800,
    quality: 0.82,
    targetMaxBytes: 1_800_000,
    uploadMaxBytes: 5 * 1024 * 1024,
  },
  album: {
    maxEdge: 2560,
    quality: 0.85,
    targetMaxBytes: 2_800_000,
    uploadMaxBytes: 8 * 1024 * 1024,
  },
  family: {
    maxEdge: 768,
    quality: 0.82,
    targetMaxBytes: 600 * 1024,
    uploadMaxBytes: 2 * 1024 * 1024,
  },
  pet: {
    maxEdge: 768,
    quality: 0.82,
    targetMaxBytes: 600 * 1024,
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

async function encodeWithQualitySteps(
  canvas: HTMLCanvasElement,
  mime: string,
  startQuality: number,
  targetMaxBytes: number
): Promise<Blob> {
  let quality = startQuality;
  let blob: Blob | null = null;
  while (quality >= 0.5) {
    blob = await canvasToBlob(canvas, mime, quality);
    if (!blob) break;
    if (blob.size <= targetMaxBytes) return blob;
    quality -= 0.06;
  }
  if (!blob) {
    throw new Error("Could not compress that photo. Try a different image.");
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
      throw new Error(`"${file.name}" is too large after processing. Try a smaller GIF.`);
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

    const scale = Math.min(1, config.maxEdge / Math.max(srcW, srcH));
    const outW = Math.max(1, Math.round(srcW * scale));
    const outH = Math.max(1, Math.round(srcH * scale));

    if (scale >= 1 && file.size <= config.targetMaxBytes && file.size <= config.uploadMaxBytes) {
      const mime = file.type;
      if (mime === "image/jpeg" || mime === "image/webp" || mime === "image/png") {
        return {
          file,
          width: srcW,
          height: srcH,
          originalSize: file.size,
          outputSize: file.size,
          skippedOptimization: true,
        };
      }
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
    const blob = await encodeWithQualitySteps(canvas, mime, config.quality, config.targetMaxBytes);
    releaseCanvas(canvas);

    if (blob.size > config.uploadMaxBytes) {
      throw new Error(
        `"${file.name}" is still too large after optimization. Try a simpler photo or fewer details.`
      );
    }

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
