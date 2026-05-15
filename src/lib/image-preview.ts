import { dimensionsForLongestEdge, probeImageDimensions } from "@/lib/image-dimensions";
import { yieldWhenIdle } from "@/lib/image-scheduler";

/** Preview longest edge — small grid thumbs without decoding multi‑MP originals. */
const PREVIEW_MAX_EDGE = 480;

const PREVIEW_JPEG_QUALITY = 0.82;

/** Avoid wiring full-res blob URLs into <Image /> for hefty picks (memory + decode stalls). */
const PREVIEW_FALLBACK_RAW_MAX_BYTES = 900_000;

function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

async function bitmapToJpegBlob(bitmap: ImageBitmap): Promise<Blob> {
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
 * Returns a blob URL for a lightweight JPEG preview (~480px longest edge).
 * Prefer this over pointing Next/Image at gigantic originals on iPhone Safari.
 */
export async function createPreviewObjectUrl(file: File): Promise<string> {
  if (file.type === "image/gif") {
    return URL.createObjectURL(file);
  }

  await yieldWhenIdle();

  if (typeof createImageBitmap !== "function") {
    return URL.createObjectURL(file);
  }

  try {
    const dims = await probeImageDimensions(file);
    let rw = PREVIEW_MAX_EDGE;
    let rh = PREVIEW_MAX_EDGE;
    if (dims && dims.width > 0 && dims.height > 0) {
      const s = dimensionsForLongestEdge(dims.width, dims.height, PREVIEW_MAX_EDGE);
      rw = s.width;
      rh = s.height;
    }

    await yieldWhenIdle();
    let bitmap = await createImageBitmap(file, {
      resizeWidth: rw,
      resizeHeight: rh,
      resizeQuality: "medium",
      imageOrientation: "from-image",
    });

    if (bitmap.width > PREVIEW_MAX_EDGE || bitmap.height > PREVIEW_MAX_EDGE) {
      bitmap.close();
      await yieldWhenIdle();
      bitmap = await createImageBitmap(file, {
        resizeWidth: Math.min(PREVIEW_MAX_EDGE, rw),
        resizeHeight: Math.min(PREVIEW_MAX_EDGE, rh),
        resizeQuality: "low",
        imageOrientation: "from-image",
      });
    }

    await yieldWhenIdle();
    const blob = await bitmapToJpegBlob(bitmap);
    return URL.createObjectURL(blob);
  } catch {
    /* Last resort: tiny originals only — large HEIC stays on optimize path instead of preview RAM bomb */
    if (file.size <= PREVIEW_FALLBACK_RAW_MAX_BYTES) {
      return URL.createObjectURL(file);
    }
    try {
      await yieldWhenIdle();
      const bmp = await createImageBitmap(file, {
        resizeWidth: 320,
        resizeHeight: 320,
        resizeQuality: "low",
        imageOrientation: "from-image",
      });
      const blob = await bitmapToJpegBlob(bmp);
      return URL.createObjectURL(blob);
    } catch {
      return URL.createObjectURL(file);
    }
  }
}

export function revokePreviewUrl(url: string | null | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}
