import { deleteObject, getDownloadURL, ref } from "firebase/storage";

import type { ProcessedImageFile } from "@/lib/image-process";
import { getUploadMaxBytes } from "@/lib/image-process";
import { validateRawImageFile } from "@/lib/image-input";
import { tryGetFirebaseStorage } from "@/lib/firebase";
import { readPublicFirebaseConfig } from "@/lib/firebase/env";
import { isMobileUploadHost, mobileUploadLog } from "@/lib/mobile-upload-debug";
import type { MediaProcessingStatus } from "@/models/media-processing";
import { promiseWithTimeout } from "@/lib/promise-timeout";
import type { UploadTrace } from "@/lib/upload-trace";
import { uploadFinalizeTrace, uploadLog, uploadStage } from "@/lib/upload-log";
import { safariUploadLog, shouldUseSimpleIOSWebKitUpload } from "@/lib/ios-webkit-upload-transport";
import {
  safariRawDiagnosticLog,
  shouldBypassBrowserTransformsForSafariRawDiagnostic,
} from "@/lib/safari-raw-diagnostic";
import { runFirebaseResumableUpload } from "@/lib/resumable-firebase-upload";

/** Per-attempt budget — retries cover Storage / CDN eventual consistency after `uploadBytes` settles. */
const DOWNLOAD_URL_ATTEMPT_MS = isMobileUploadHost() ? 42_000 : 32_000;
const DOWNLOAD_URL_MAX_ATTEMPTS = isMobileUploadHost() ? 7 : 5;

function isRetriableDownloadUrlError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return false;
  const msg = e instanceof Error ? e.message : String(e);
  const m = msg.toLowerCase();
  if (m.includes("abort")) return false;
  if (m.includes("unauthorized") || m.includes("permission_denied") || m.includes("permission denied")) return false;
  if (m.includes("403")) return false;
  return (
    m.includes("timed out") ||
    m.includes("deadline") ||
    m.includes("object-not-found") ||
    m.includes("object not found") ||
    m.includes("does not exist") ||
    m.includes("network") ||
    m.includes("offline") ||
    m.includes("failed to fetch") ||
    m.includes("load failed") ||
    msg.includes("storage/")
  );
}

async function getDownloadURLSingleAttempt(
  objectRef: ReturnType<typeof ref>,
  storagePath: string,
  attempt: number
): Promise<string> {
  uploadStage("download URL resolving", { path: storagePath, attempt });
  return promiseWithTimeout(
    getDownloadURL(objectRef),
    DOWNLOAD_URL_ATTEMPT_MS,
    () => {
      uploadFinalizeTrace("stalled during getDownloadURL", { path: storagePath, attempt });
      uploadStage("stalled waiting for download URL", { path: storagePath, attempt });
    }
  );
}

async function getDownloadURLWithTimeout(objectRef: ReturnType<typeof ref>, storagePath: string): Promise<string> {
  uploadFinalizeTrace("requesting download URL", { path: storagePath, attemptsPlanned: DOWNLOAD_URL_MAX_ATTEMPTS });
  let last: unknown;
  for (let attempt = 1; attempt <= DOWNLOAD_URL_MAX_ATTEMPTS; attempt++) {
    try {
      const url = await getDownloadURLSingleAttempt(objectRef, storagePath, attempt);
      uploadFinalizeTrace("download URL resolved", { path: storagePath, attempt });
      uploadStage("download URL resolved", { path: storagePath, attempt });
      if (shouldUseSimpleIOSWebKitUpload()) {
        safariUploadLog("download URL resolved", { path: storagePath, attempt });
      }
      return url;
    } catch (e) {
      last = e;
      const retriable = attempt < DOWNLOAD_URL_MAX_ATTEMPTS && isRetriableDownloadUrlError(e);
      uploadStage("download URL attempt failed", {
        path: storagePath,
        attempt,
        willRetry: retriable,
        error: String(e),
      });
      if (!retriable) {
        uploadFinalizeTrace("download URL failed", { path: storagePath, attempt, error: String(e) });
        throw e;
      }
      const backoff = Math.min(10_000, 400 * 2 ** (attempt - 1)) + Math.round(Math.random() * 180);
      uploadFinalizeTrace("download URL retry", { path: storagePath, attempt, nextMs: backoff });
      await new Promise<void>((r) => window.setTimeout(r, backoff));
    }
  }
  uploadFinalizeTrace("download URL failed", { path: storagePath, error: String(last) });
  throw last;
}

/** Raw upload extension — keep recognizable suffixes for Storage + Functions routing (never `.img`). */
function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
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
  validateRawImageFile(file);
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`"${file.name}" exceeds the ${mb} MB upload limit.`);
  }
}

function artifactProcessingStatus(storagePath: string, mime: string): MediaProcessingStatus {
  if (mime === "image/gif") return "ready";
  /** Raw uploads: Sharp pipeline runs async — Firestore reflects "processing" until Functions merge variants. */
  return storagePath.startsWith("uploads/raw/") ? "processing" : "ready";
}

function feedArtifactPath(uid: string, postId: string, slot: number, file: File): string {
  const ext =
    file.type === "image/gif" ? "gif" : extFromMime(file.type || "image/jpeg");
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
  const cfg = readPublicFirebaseConfig();
  const storageBucket = cfg?.storageBucket ?? "(firebase storage bucket not configured)";
  uploadStage("storage upload path resolved", { domain, storageBucket, fullPath, ...meta });
  mobileUploadLog("storage destination", { domain, storageBucket, fullPath, ...meta });
}

/** Storage bytes are complete; `url` may be null until background hydration resolves. */
export type UploadedObject = {
  url: string | null;
  path: string;
  processingStatus: MediaProcessingStatus;
};

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
    validateNormalizedUpload(file, MAX_NORMALIZED_BYTES);
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
      if (shouldBypassBrowserTransformsForSafariRawDiagnostic()) {
        safariRawDiagnosticLog("original file upload start", {
          path: storagePath,
          size: file.size,
          mime: file.type || "unknown",
          name: file.name,
        });
      }
      await uploadFileResumable(objectRef, file, {
        signal,
        label: storagePath,
        trace,
        onFilePercent: (filePercent) => onProgress?.(i, total, filePercent),
      });
      uploadFinalizeTrace("raw upload complete", { path: storagePath, index: i });
      if (shouldBypassBrowserTransformsForSafariRawDiagnostic()) {
        safariRawDiagnosticLog("original file upload success", {
          path: storagePath,
          size: file.size,
          mime: file.type || "unknown",
        });
        safariRawDiagnosticLog("storage object confirmed", { path: storagePath });
      }
      onProgress?.(i, total, 100);
      out.push({
        url: null,
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
    validateNormalizedUpload(file, MAX_NORMALIZED_BYTES);
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
      if (shouldBypassBrowserTransformsForSafariRawDiagnostic()) {
        safariRawDiagnosticLog("original file upload start", {
          path,
          size: file.size,
          mime: file.type || "unknown",
          name: file.name,
        });
      }
      await uploadFileResumable(objectRef, file, {
        signal,
        label: path,
        trace,
        onFilePercent: (filePercent) => onProgress?.(i, total, filePercent),
      });
      uploadFinalizeTrace("raw upload complete", { path, index: i });
      if (shouldBypassBrowserTransformsForSafariRawDiagnostic()) {
        safariRawDiagnosticLog("original file upload success", {
          path,
          size: file.size,
          mime: file.type || "unknown",
        });
        safariRawDiagnosticLog("storage object confirmed", { path });
      }
      onProgress?.(i, total, 100);
      out.push({
        url: null,
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

/**
 * Resolves download URLs outside the upload finalize critical path.
 * Failures are logged only — callers must not treat hydration as required for persistence.
 */
export function scheduleBackgroundStorageUrlHydration(
  slots: ReadonlyArray<{ path: string }>,
  onSlotResolved: (path: string, url: string) => void | Promise<void>
): void {
  const storage = tryGetFirebaseStorage();
  if (!storage || slots.length === 0) return;

  uploadFinalizeTrace("background URL hydration start", { paths: slots.map((s) => s.path) });

  void (async () => {
    for (const slot of slots) {
      try {
        const objectRef = ref(storage, slot.path);
        const url = await getDownloadURLWithTimeout(objectRef, slot.path);
        uploadFinalizeTrace("background URL hydration success", { path: slot.path });
        await onSlotResolved(slot.path, url);
      } catch (e) {
        uploadFinalizeTrace("background URL hydration failed", { path: slot.path, error: String(e) });
      }
    }
  })();
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
    for (const ext of ["jpg", "jpeg", "webp", "png", "gif", "heic", "heif"]) {
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
