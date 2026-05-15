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

function readUint16(bytes: Uint8Array, offset: number, littleEndian: boolean): number {
  const b0 = bytes[offset]!;
  const b1 = bytes[offset + 1]!;
  return littleEndian ? b0 | (b1 << 8) : (b0 << 8) | b1;
}

function readUint32(bytes: Uint8Array, offset: number, littleEndian: boolean): number {
  const b0 = bytes[offset]!;
  const b1 = bytes[offset + 1]!;
  const b2 = bytes[offset + 2]!;
  const b3 = bytes[offset + 3]!;
  return littleEndian
    ? b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)
    : (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
}

/**
 * Parses IFD0 Orientation (tag 0x0112) from an embedded TIFF header inside JPEG APP1.
 * Returns null when absent so callers assume orientation 1 (normal).
 */
function parseTiffIfd0Orientation(bytes: Uint8Array, tiffStart: number): number | null {
  if (tiffStart + 8 > bytes.length) return null;
  const bom = (bytes[tiffStart]! << 8) | bytes[tiffStart + 1]!;
  const littleEndian = bom === 0x4949;
  if (bom !== 0x4949 && bom !== 0x4d4d) return null;

  const ifd0Rel = readUint32(bytes, tiffStart + 4, littleEndian);
  const ifd0 = tiffStart + ifd0Rel;
  if (ifd0 + 2 > bytes.length || ifd0 < tiffStart) return null;

  const entryCount = readUint16(bytes, ifd0, littleEndian);
  let p = ifd0 + 2;
  const safeEntries = Math.min(entryCount, 48);

  for (let e = 0; e < safeEntries; e++) {
    if (p + 12 > bytes.length) break;
    const tag = readUint16(bytes, p, littleEndian);
    const type = readUint16(bytes, p + 2, littleEndian);
    const count = readUint32(bytes, p + 4, littleEndian);
    if (tag === 0x0112 && type === 3 && count === 1) {
      const raw = readUint16(bytes, p + 8, littleEndian);
      if (raw >= 1 && raw <= 8) return raw;
      return null;
    }
    p += 12;
  }
  return null;
}

function readJpegExifOrientation(bytes: Uint8Array): number | null {
  let i = 2;
  while (i < bytes.length - 14) {
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
    if (len < 2 || i + 2 + len > bytes.length) {
      i++;
      continue;
    }

    if (marker === 0xe1 && len >= 14) {
      const payloadOffset = i + 4;
      if (
        payloadOffset + 6 <= bytes.length &&
        bytes[payloadOffset] === 0x45 &&
        bytes[payloadOffset + 1] === 0x78 &&
        bytes[payloadOffset + 2] === 0x69 &&
        bytes[payloadOffset + 3] === 0x66 &&
        bytes[payloadOffset + 4] === 0 &&
        bytes[payloadOffset + 5] === 0
      ) {
        const tiffStart = payloadOffset + 6;
        const o = parseTiffIfd0Orientation(bytes, tiffStart);
        if (o !== null) return o;
      }
    }

    i += 2 + len;
  }
  return null;
}

/** Stored JPEG raster dimensions from SOF — pre‑EXIF orientation. */
function readJpegStoredDimensions(bytes: Uint8Array): ImageDimensions | null {
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

/**
 * Applies EXIF orientation to pixel dimensions read from JPEG SOF markers.
 * Orientations 5–8 transpose width/height vs stored raster so sizing matches browser decode (`imageOrientation: "from-image"`).
 */
export function jpegOrientedDimensionsFromStoredAndExif(
  storedWidth: number,
  storedHeight: number,
  exifOrientation: number | null | undefined
): ImageDimensions {
  const o = exifOrientation ?? 1;
  if (o >= 5 && o <= 8) {
    return { width: storedHeight, height: storedWidth };
  }
  return { width: storedWidth, height: storedHeight };
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

  /* Prefer JPEG SOF + EXIF orientation — matches createImageBitmap(..., imageOrientation: "from-image"). ImageDecoder often reports coded (pre‑orientation) dimensions. */
  if (type === "image/jpeg" || /\.(jpe?g)$/i.test(file.name)) {
    const head = await readHeadSlice(file, JPEG_HEAD_BYTES);
    const stored = readJpegStoredDimensions(head);
    if (stored) {
      const orientation = readJpegExifOrientation(head);
      return jpegOrientedDimensionsFromStoredAndExif(stored.width, stored.height, orientation);
    }
  }

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
