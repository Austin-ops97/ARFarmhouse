/**
 * Fast dimension probes that avoid decoding full-resolution bitmaps where possible.
 * Used to pass correct resizeWidth/resizeHeight into createImageBitmap (memory-safe decode).
 */

const JPEG_HEAD_BYTES = 512 * 1024;
const PNG_HEAD_BYTES = 32;
const WEBP_HEAD_BYTES = 256 * 1024;

export type ImageDimensions = { width: number; height: number };

function guessMimeFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  if (n.endsWith(".heic") || n.endsWith(".heif")) return "image/heic";
  if (n.endsWith(".avif")) return "image/avif";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

function readJpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  let i = 0;
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  i = 2;
  while (i < bytes.length - 9) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1]!;
    if (marker === 0xd9) break;
    if (marker === 0xda || marker === 0xd8) {
      i += 2;
      continue;
    }
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (len < 2 || i + 2 + len > bytes.length) return null;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7)) {
      const h = (bytes[i + 5]! << 8) | bytes[i + 6]!;
      const w = (bytes[i + 7]! << 8) | bytes[i + 8]!;
      if (w > 0 && h > 0) return { width: w, height: h };
      return null;
    }
    i += 2 + len;
  }
  return null;
}

function readPngDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 24) return null;
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    const w = (bytes[16]! << 24) | (bytes[17]! << 16) | (bytes[18]! << 8) | bytes[19]!;
    const h = (bytes[20]! << 24) | (bytes[21]! << 16) | (bytes[22]! << 8) | bytes[23]!;
    if (w > 0 && h > 0) return { width: w, height: h };
  }
  return null;
}

function readWebpDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes.length < 30) return null;
  if (String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF") return null;
  if (String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP") return null;
  const chunk = String.fromCharCode(...bytes.slice(12, 16));
  if (chunk === "VP8 " && bytes.length >= 30) {
    const w = bytes[26]! | (bytes[27]! << 8);
    const h = bytes[28]! | (bytes[29]! << 8);
    if (w > 0 && h > 0) return { width: w & 0x3fff, height: h & 0x3fff };
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    const b = bytes[21]! | (bytes[22]! << 8) | (bytes[23]! << 16) | (bytes[24]! << 24);
    const w = (b & 0x3fff) + 1;
    const h = ((b >> 14) & 0x3fff) + 1;
    if (w > 0 && h > 0) return { width: w, height: h };
  }
  if (chunk === "VP8X" && bytes.length >= 30) {
    const w = 1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16));
    const h = 1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16));
    if (w > 0 && h > 0) return { width: w, height: h };
  }
  return null;
}

async function probeWithImageDecoder(file: File): Promise<ImageDimensions | null> {
  type DecoderInstance = {
    tracks: {
      ready: Promise<void>;
      selectedTrack: { codedWidth: number; codedHeight: number };
    };
    close: () => Promise<void>;
  };

  type DecoderConstructor = {
    new (opts: { data: ReadableStream<Uint8Array>; type: string }): DecoderInstance;
    isTypeSupported(type: string): boolean;
  };

  const ImgDec = (globalThis as unknown as { ImageDecoder?: DecoderConstructor }).ImageDecoder;
  if (!ImgDec) return null;
  const type = file.type || guessMimeFromName(file.name);
  if (!type) return null;
  if (!ImgDec.isTypeSupported(type)) return null;
  let decoder: DecoderInstance | null = null;
  try {
    decoder = new ImgDec({ data: file.stream(), type });
    await decoder.tracks.ready;
    const t = decoder.tracks.selectedTrack;
    const width = t.codedWidth;
    const height = t.codedHeight;
    if (width > 0 && height > 0) return { width, height };
  } catch {
    /* fall through — header sniff below */
  } finally {
    try {
      await decoder?.close();
    } catch {
      /* noop */
    }
  }
  return null;
}

async function readHeadSlice(file: File, max: number): Promise<Uint8Array> {
  const slice = await file.slice(0, Math.min(max, file.size)).arrayBuffer();
  return new Uint8Array(slice);
}

/**
 * Returns pixel dimensions when cheaply obtainable without full GPU decode.
 * `null` means callers should use a guarded decode fallback (HEIC/HDR edge cases).
 */
export async function probeImageDimensions(file: File): Promise<ImageDimensions | null> {
  const type = file.type || guessMimeFromName(file.name);

  const decoded = await probeWithImageDecoder(file);
  if (decoded) return decoded;

  if (type === "image/png" || /\.png$/i.test(file.name)) {
    const head = await readHeadSlice(file, PNG_HEAD_BYTES);
    return readPngDimensions(head);
  }

  if (type === "image/webp" || /\.webp$/i.test(file.name)) {
    const head = await readHeadSlice(file, WEBP_HEAD_BYTES);
    return readWebpDimensions(head);
  }

  if (type === "image/jpeg" || /\.(jpe?g)$/i.test(file.name)) {
    const head = await readHeadSlice(file, JPEG_HEAD_BYTES);
    return readJpegDimensions(head);
  }

  return null;
}

/** Longest-edge contain resize — both dimensions ≥ 1. */
export function dimensionsForLongestEdge(
  srcW: number,
  srcH: number,
  maxEdge: number
): { width: number; height: number } {
  const longest = Math.max(srcW, srcH);
  const scale = Math.min(1, maxEdge / longest);
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}
