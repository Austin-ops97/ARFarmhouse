/**
 * Client-side upload validation — first line of defense before Storage writes.
 * Server rules in storage.rules provide the authoritative gate.
 */

export const UPLOAD_LIMITS = {
  maxBytes: 150 * 1024 * 1024,
  maxBytesDataSaver: 25 * 1024 * 1024,
  maxDimension: 8192,
  allowedMimePrefixes: ["image/"] as const,
  blockedExtensions: [
    ".exe",
    ".bat",
    ".cmd",
    ".sh",
    ".msi",
    ".apk",
    ".dmg",
    ".js",
    ".html",
    ".svg",
  ] as const,
} as const;

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

function hasBlockedExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return UPLOAD_LIMITS.blockedExtensions.some((ext) => lower.endsWith(ext));
}

export function validateImageUpload(
  file: File,
  opts?: { dataSaver?: boolean }
): UploadValidationResult {
  if (!file || file.size <= 0) {
    return { ok: false, reason: "Empty file." };
  }

  const maxBytes = opts?.dataSaver
    ? UPLOAD_LIMITS.maxBytesDataSaver
    : UPLOAD_LIMITS.maxBytes;

  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { ok: false, reason: `File exceeds ${mb} MB limit.` };
  }

  if (hasBlockedExtension(file.name)) {
    return { ok: false, reason: "This file type is not allowed." };
  }

  const type = file.type?.toLowerCase() ?? "";
  const isImage =
    UPLOAD_LIMITS.allowedMimePrefixes.some((p) => type.startsWith(p)) ||
    type === "application/octet-stream" ||
    type === "";

  if (!isImage) {
    return { ok: false, reason: "Only images can be uploaded." };
  }

  return { ok: true };
}

export function validateImageBatch(
  files: File[],
  opts?: { dataSaver?: boolean; maxCount?: number }
): UploadValidationResult {
  const max = opts?.maxCount ?? 10;
  if (files.length > max) {
    return { ok: false, reason: `Maximum ${max} images per upload.` };
  }
  for (const file of files) {
    const result = validateImageUpload(file, opts);
    if (!result.ok) return result;
  }
  return { ok: true };
}
