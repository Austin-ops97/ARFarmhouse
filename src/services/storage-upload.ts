import { deleteObject, getDownloadURL, ref } from "firebase/storage";

import { getUploadMaxBytes, type ImageUploadPreset } from "@/lib/image-process";
import { tryGetFirebaseStorage } from "@/lib/firebase";
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

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "img";
}

function validateOptimizedUpload(file: File, maxBytes: number) {
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

export async function uploadPostImages(
  postId: string,
  files: File[],
  onProgress?: (done: number, total: number, filePercent?: number) => void,
  signal?: AbortSignal,
  trace?: UploadTrace
) {
  return uploadImagesToPrefix(`posts/${postId}`, files, "feed", onProgress, signal, trace);
}

export type UploadedObject = { url: string; path: string };

export async function uploadAlbumImages(
  mediaId: string,
  files: File[],
  onProgress?: (done: number, total: number, filePercent?: number) => void,
  signal?: AbortSignal,
  trace?: UploadTrace
): Promise<UploadedObject[]> {
  const storage = tryGetFirebaseStorage();
  if (!storage) throw new Error("Firebase Storage unavailable. Check your connection and try again.");

  const maxBytes = getUploadMaxBytes("album");
  const out: UploadedObject[] = [];
  const total = files.length;
  uploadLog("album_batch_start", { mediaId, total });

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");
    const file = files[i]!;
    validateOptimizedUpload(file, maxBytes);
    const ext = extFromMime(file.type || "image/jpeg");
    const path = `albums/${mediaId}/${Date.now()}-${i}.${ext}`;
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
      out.push({ url, path });
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
  await runFirebaseResumableUpload(objectRef, file, {
    contentType: file.type || "image/jpeg",
    signal: opts?.signal,
    label: opts?.label,
    trace: opts?.trace,
    onProgress: opts?.onFilePercent,
  });
}

async function uploadImagesToPrefix(
  pathPrefix: string,
  files: File[],
  preset: ImageUploadPreset,
  onProgress?: (done: number, total: number, filePercent?: number) => void,
  signal?: AbortSignal,
  trace?: UploadTrace
): Promise<string[]> {
  const storage = tryGetFirebaseStorage();
  if (!storage) throw new Error("Firebase Storage unavailable. Check your connection and try again.");

  const maxBytes = getUploadMaxBytes(preset);
  const urls: string[] = [];
  const total = files.length;
  uploadLog("post_batch_start", { pathPrefix, total });

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");
    const file = files[i]!;
    validateOptimizedUpload(file, maxBytes);
    const ext = extFromMime(file.type || "image/jpeg");
    const storagePath = `${pathPrefix}/${Date.now()}-${i}.${ext}`;
    const objectRef = ref(storage, storagePath);
    try {
      onProgress?.(i, total, 0);
      await uploadFileResumable(objectRef, file, {
        signal,
        label: storagePath,
        trace,
        onFilePercent: (filePercent) => onProgress?.(i, total, filePercent),
      });
      const url = await getDownloadURLWithTimeout(objectRef, storagePath);
      urls.push(url);
      uploadLog("post_file_complete", { index: i + 1, total });
    } catch (e) {
      uploadLog("post_file_failed", { index: i + 1, total, error: String(e) });
      throw storageUploadError(file.name, e);
    }
    onProgress?.(i + 1, total, 100);
  }

  uploadLog("post_batch_complete", { pathPrefix, count: urls.length });
  return urls;
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

/** Best-effort delete by Storage object path (e.g. `posts/abc/123.jpg`). */
export async function deleteStoragePath(storagePath: string) {
  const storage = tryGetFirebaseStorage();
  if (!storage || !storagePath.trim()) return;
  await deleteObject(ref(storage, storagePath));
}

/** Delete all objects under a feed post prefix. */
export async function deletePostMediaStorage(postId: string, mediaUrls: string[]) {
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
  if (paths.size === 0) {
    uploadLog("delete_post_media_skipped", { postId, urlCount: mediaUrls.length });
    return;
  }
  await Promise.allSettled([...paths].map((p) => deleteObject(ref(storage, p))));
}
