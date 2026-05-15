import { yieldToMainThread } from "@/lib/image-scheduler";

/** Thumbnail edge — small enough for grids, avoids decoding 12MP originals in <Image>. */
const PREVIEW_MAX_EDGE = 480;

const PREVIEW_JPEG_QUALITY = 0.82;

function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

async function bitmapToPreviewBlob(bitmap: ImageBitmap): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not create preview.");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", PREVIEW_JPEG_QUALITY);
  });
  releaseCanvas(canvas);

  if (!blob) throw new Error("Could not create preview.");
  return blob;
}

/**
 * Returns a blob URL for a lightweight JPEG preview (~480px edge).
 * Safe for React state — never points at multi-megapixel originals.
 */
export async function createPreviewObjectUrl(file: File): Promise<string> {
  if (file.type === "image/gif") {
    return URL.createObjectURL(file);
  }

  await yieldToMainThread();

  if (typeof createImageBitmap !== "function") {
    return URL.createObjectURL(file);
  }

  try {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: PREVIEW_MAX_EDGE,
      resizeQuality: "medium",
    });

    if (bitmap.width <= PREVIEW_MAX_EDGE && bitmap.height <= PREVIEW_MAX_EDGE && file.size < 400_000) {
      bitmap.close();
      return URL.createObjectURL(file);
    }

    await yieldToMainThread();
    const blob = await bitmapToPreviewBlob(bitmap);
    return URL.createObjectURL(blob);
  } catch {
    return URL.createObjectURL(file);
  }
}

export function revokePreviewUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}
