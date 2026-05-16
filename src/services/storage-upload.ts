import { deleteObject, getDownloadURL, ref } from "firebase/storage";

import type { ProcessedImageFile } from "@/lib/image-process";
import { getUploadMaxBytes } from "@/lib/image-process";
import { tryGetFirebaseStorage } from "@/lib/firebase";
import { isMobileUploadHost, mobileUploadLog } from "@/lib/mobile-upload-debug";
import type { MediaProcessingStatus } from "@/models/media-processing";
import { promiseWithTimeout } from "@/lib/promise-timeout";
import type { UploadTrace } from "@/lib/upload-trace";
import { uploadLog, uploadStage } from "@/lib/upload-log";
import { runFirebaseResumableUpload } from "@/lib/resumable-firebase-upload";

const DOWNLOAD_URL_TIMEOUT_MS = 90_000;

async function getDownloadURLWithTimeout(objectRef: ReturnType<typeof ref>, storagePath: string): Promise<string> {
  uploadStage("download URL resolving", { path: storagePath });
  try {
    const url = await promiseWithTimeout(
      getDownloadURL(objectRef),
      DOWNLOAD_URL_TIMEOUT_MS,
      () => {
        uploadStage("stalled waiting for download URL", { path: storagePath });
      }
    );
    uploadStage("download URL resolved", { path: storagePath });
    return url;
  } catch (e) {
    uploadStage("download URL failed", { path: storagePath, error: String(e) });
    throw e;
  }
}

/** Extensions must stay aligned with `storage.rules` `original.(…)` patterns — never emit `.img`. */
function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime.startsWith("image/")) return "jpg";
  return "jpg";
}

function isTransientUploadFailure(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return false;
  const raw = e instanceof Error ? e.message : String(e);
  const msg = raw.toLowerCase();
  if (msg.includes("abort")) return false;
  if (msg.includes("unauthorized") || msg.includes("permission_denied") || msg.includes("permission denied")) return false;
  if (msg.includes("403")) return false;
  return (
    msg.includes("network") ||
    msg.includes("offline") ||
    msg.includes("deadline") ||
    msg.includes("stalled") ||
    msg.includes("timed out") ||
    msg.includes("retry") ||
    msg.includes("internal") ||
    msg.includes("unavailable") ||
    msg.includes("quota") ||
    raw.includes("storage/") ||
    msg.includes("failed to fetch") ||
    msg.includes("load failed")
  );
}

/** Waits for token propagation after upload completes — same timeout path as feed/album uploads. */
export async function waitForStorageDownloadURL(objectRef: ReturnType<typeof ref>, storagePath: string): Promise<string> {
  return getDownloadURLWithTimeout(objectRef, storagePath);
}

/** Resumable Storage upload with cellular-friendly transient retries. */
export async function uploadStorageImageResumable(
  objectRef: ReturnType<typeof ref>,
  file: File,
  opts?: {
    signal?: AbortSignal;
    label?: string;
    trace?: UploadTrace;
    onProgress?: (percent: number) => void;
  }
): Promise<void> {
  const maxAttempts = isMobileUploadHost() ? 3 : 2;
  let last: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await runFirebaseResumableUpload(objectRef, file, {
        contentType: file.type || "image/jpeg",
        signal: opts?.signal,
        label: opts?.label,
        trace: opts?.trace,
        onProgress: opts?.onProgress,
      });
      return;
    } catch (e) {
      last = e;
      if (opts?.signal?.aborted) throw e;
      if (!isTransientUploadFailure(e) || attempt >= maxAttempts) throw e;
      mobileUploadLog("retrying upload after transient failure", {
        attempt,
        maxAttempts,
        label: opts?.label,
        message: e instanceof Error ? e.message : String(e),
      });
      await new Promise<void>((r) => window.setTimeout(r, 650 * attempt));
    }
  }
  throw last;
}

function validateNormalizedUpload(file: File, maxBytes: number) {
  if (!file.type.startsWith("image/")) {
    throw new Error(`"${file.name}" is not a supported image.`);
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`"${file.name}" exceeds the ${mb} MB upload limit.`);
  }
  if (file.size === 0) {
    throw new Error(`"${file.name}" appears to be empty.`);
  }
}

function artifactProcessingStatus(storagePath: string, mime: string): MediaProcessingStatus {
  if (mime === "image/gif") return "ready";
  return storagePath.startsWith("uploads/raw/") ? "pending" : "ready";
}

function feedArtifactPath(uid: string, postId: string, slot: number, file: File): string {
  if (file.type === "image/gif") {
    return `posts/${postId}/${Date.now()}-${slot}.gif`;
  }
  const ext = extFromMime(file.type || "image/jpeg");
  return `uploads/raw/${uid}/posts/${postId}/${slot}/original.${ext}`;
}

function albumArtifactPath(uid: string, mediaId: string, file: File): string {
  const ext = extFromMime(file.type || "image/jpeg");
  return `uploads/raw/${uid}/albumMedia/${mediaId}/original.${ext}`;
}

function logResolvedStorageDestination(
  domain: "feed_raw" | "album_raw" | "profile" | "family" | "pet",
  fullPath: string,
  meta: Record<string, string | number | undefined>
) {
  uploadStage("storage upload path resolved", { domain, fullPath, ...meta });
  mobileUploadLog("storage destination", { domain, fullPath, ...meta });
}

export type UploadedObject = { url: string; path: string; processingStatus: MediaProcessingStatus };

const MAX_NORMALIZED_BYTES = Math.max(getUploadMaxBytes("feed"), getUploadMaxBytes("album"));

export async function uploadPostImages(
  authorUid: string,
  postId: string,
  artifacts: ProcessedImageFile[],
  onProgress?: (done: number, total: number, filePercent?: number) => void,
  signal?: AbortSignal,
  trace?: UploadTrace
): Promise<UploadedObject[]> {
  const storage = tryGetFirebaseStorage();
  if (!storage) throw new Error("Firebase Storage unavailable. Check your connection and try again.");

  const out: UploadedObject[] = [];
  const total = artifacts.length;
  uploadLog("post_batch_start", { pathPrefix: `posts/${postId}`, total });

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");
    const artifact = artifacts[i]!;
    const file = artifact.file;
    validateNormalizedUpload(file, file.type === "image/gif" ? 20 * 1024 * 1024 : MAX_NORMALIZED_BYTES);
    const storagePath = feedArtifactPath(authorUid, postId, i, file);
    logResolvedStorageDestination("feed_raw", storagePath, {
      authorUid,
      postId,
      slot: i,
      mime: file.type || "unknown",
    });
    const objectRef = ref(storage, storagePath);
    try {
      onProgress?.(i, total, 0);
      uploadLog("post_file_upload", { postId, index: i + 1, total, path: storagePath });
      await uploadFileResumable(objectRef, file, {
        signal,
        label: storagePath,
        trace,
        onFilePercent: (filePercent) => onProgress?.(i, total, filePercent),
      });
      const url = await getDownloadURLWithTimeout(objectRef, storagePath);
      out.push({
        url,
        path: storagePath,
        processingStatus: artifactProcessingStatus(storagePath, file.type || ""),
      });
    } catch (e) {
      uploadLog("post_file_failed", { index: i + 1, total, error: String(e) });
      throw storageUploadError(file.name, e);
    }
    onProgress?.(i + 1, total, 100);
  }

  uploadLog("post_batch_complete", { pathPrefix: `posts/${postId}`, count: out.length });
  return out;
}

export async function uploadAlbumImages(
  authorUid: string,
  mediaId: string,
  artifacts: ProcessedImageFile[],
  onProgress?: (done: number, total: number, filePercent?: number) => void,
  signal?: AbortSignal,
  trace?: UploadTrace
): Promise<UploadedObject[]> {
  const storage = tryGetFirebaseStorage();
  if (!storage) throw new Error("Firebase Storage unavailable. Check your connection and try again.");

  const out: UploadedObject[] = [];
  const total = artifacts.length;
  uploadLog("album_batch_start", { mediaId, total });

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");
    const artifact = artifacts[i]!;
    const file = artifact.file;
    validateNormalizedUpload(file, file.type === "image/gif" ? 20 * 1024 * 1024 : MAX_NORMALIZED_BYTES);
    const path = albumArtifactPath(authorUid, mediaId, file);
    logResolvedStorageDestination("album_raw", path, {
      authorUid,
      mediaId,
      mime: file.type || "unknown",
    });
    const objectRef = ref(storage, path);
    try {
      onProgress?.(i, total, 0);
      uploadLog("album_file_upload", { mediaId, index: i + 1, total, path });
      await uploadFileResumable(objectRef, file, {
        signal,
        label: path,
        trace,
        onFilePercent: (filePercent) => onProgress?.(i, total, filePercent),
      });
      const url = await getDownloadURLWithTimeout(objectRef, path);
      out.push({
        url,
        path,
        processingStatus: artifactProcessingStatus(path, file.type || ""),
      });
    } catch (e) {
      uploadLog("album_file_failed", { mediaId, index: i + 1, error: String(e) });
      throw storageUploadError(file.name, e);
    }
    onProgress?.(i + 1, total, 100);
  }

  uploadLog("album_batch_complete", { mediaId, count: out.length });
  return out;
}

async function uploadFileResumable(
  objectRef: ReturnType<typeof ref>,
  file: File,
  opts?: {
    signal?: AbortSignal;
    label?: string;
    trace?: UploadTrace;
    onFilePercent?: (percent: number) => void;
  }
): Promise<void> {
  await uploadStorageImageResumable(objectRef, file, {
    signal: opts?.signal,
    label: opts?.label,
    trace: opts?.trace,
    onProgress: opts?.onFilePercent,
  });
}

function storageUploadError(fileName: string, e: unknown): Error {
  if (e instanceof DOMException && e.name === "AbortError") return e;
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("unauthorized") || msg.includes("permission")) {
    return new Error("Image upload was denied. Sign in again and check Storage rules.");
  }
  if (msg.includes("network") || msg.includes("offline") || msg.includes("failed")) {
    return new Error("Upload interrupted. Check your connection and try again.");
  }
  return new Error(`Could not upload "${fileName}". ${msg}`);
}

async function deleteStoragePathQuiet(storage: NonNullable<ReturnType<typeof tryGetFirebaseStorage>>, storagePath: string) {
  const trimmed = storagePath.trim();
  if (!trimmed) return;
  try {
    await deleteObject(ref(storage, trimmed));
  } catch {
    /* missing path ok */
  }
}

/** Best-effort delete by Storage object path */
export async function deleteStoragePath(storagePath: string) {
  const storage = tryGetFirebaseStorage();
  if (!storage || !storagePath.trim()) return;
  await deleteStoragePathQuiet(storage, storagePath);
}

/** Removes legacy parsed URLs plus deterministic Sharp/raw folders for a feed post */
export async function deletePostMediaArtifacts(authorId: string, postId: string, mediaUrls: string[]) {
  const storage = tryGetFirebaseStorage();
  if (!storage) return;
  const paths = new Set<string>();
  for (const url of mediaUrls) {
    try {
      const path = decodeURIComponent(url.split("/o/")[1]?.split("?")[0] ?? "");
      if (path) paths.add(path);
    } catch {
      /* ignore malformed */
    }
  }
  const slotCount = mediaUrls.length;
  for (let i = 0; i < slotCount; i++) {
    for (const ext of ["jpg", "jpeg", "webp", "png"]) {
      paths.add(`uploads/raw/${authorId}/posts/${postId}/${i}/original.${ext}`);
    }
    for (const name of ["thumb.webp", "feed.webp", "full.webp"]) {
      paths.add(`media/processed/posts/${postId}/${i}/${name}`);
    }
  }
  await Promise.allSettled([...paths].map((p) => deleteStoragePathQuiet(storage, p)));
}

/** Album doc cleanup — raw Sharp uploads plus derived variants */
export async function deleteAlbumMediaArtifacts(authorId: string, mediaId: string, rawStoragePath?: string | null) {
  const storage = tryGetFirebaseStorage();
  if (!storage) return;
  const paths = new Set<string>();
  if (rawStoragePath?.trim()) paths.add(rawStoragePath.trim());
  for (const ext of ["jpg", "jpeg", "webp", "png", "gif"]) {
    paths.add(`uploads/raw/${authorId}/albumMedia/${mediaId}/original.${ext}`);
  }
  for (const name of ["thumb.webp", "feed.webp", "full.webp"]) {
    paths.add(`media/processed/albumMedia/${mediaId}/${name}`);
  }
  await Promise.allSettled([...paths].map((p) => deleteStoragePathQuiet(storage, p)));
}
