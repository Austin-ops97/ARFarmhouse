import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  limit,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { actionDebug } from "@/lib/action-debug";
import { formatFeedTimeLabel } from "@/lib/datetime/relative";
import { validateRawImageFile } from "@/lib/image-input";
import { getUploadMaxBytes, type ProcessedImageFile } from "@/lib/image-process";
import { prepareOptimizedArtifactsForFirebase } from "@/lib/image-upload-pipeline";
import { safariUploadLog, shouldUseSimpleIOSWebKitUpload } from "@/lib/ios-webkit-upload-transport";
import {
  safariRawDiagnosticLog,
  shouldBypassBrowserTransformsForSafariRawDiagnostic,
} from "@/lib/safari-raw-diagnostic";
import { mobileUploadLog } from "@/lib/mobile-upload-debug";
import { uploadFinalizeTrace, uploadStage } from "@/lib/upload-log";
import type { AlbumMediaItem } from "@/lib/photo-album-media";
import type { UploadTrace } from "@/lib/upload-trace";
import { tryGetFirestoreDb } from "@/lib/firebase";
import type { FirestoreAlbumMedia } from "@/models/album-media";
import type { UserRole } from "@/models/user";
import {
  deleteAlbumMediaArtifacts,
  scheduleBackgroundStorageUrlHydration,
  uploadAlbumImages,
  type UploadedObject,
} from "@/services/storage-upload";

const COLLECTION = "albumMedia";

/** Album tile is display-ready when a persisted CDN/raw URL exists. */
export function isAlbumMediaDisplayReady(item: AlbumMediaItem): boolean {
  return item.src.trim().length > 0;
}

function mapAlbumMediaDoc(snapshot: QueryDocumentSnapshot<DocumentData>): AlbumMediaItem {
  const d = snapshot.data() as Partial<FirestoreAlbumMedia>;
  const created = d.createdAt?.toDate?.() ?? new Date();
  const albumKey = typeof d.albumKey === "string" ? d.albumKey : "general";
  const width = typeof d.width === "number" && d.width > 0 ? d.width : undefined;
  const height = typeof d.height === "number" && d.height > 0 ? d.height : undefined;
  const thumb =
    typeof d.thumbnailUrl === "string" && d.thumbnailUrl.trim().length > 0 ? d.thumbnailUrl.trim() : "";
  const storageUrl = typeof d.storageUrl === "string" ? d.storageUrl.trim() : "";
  const fullScreen =
    typeof d.fullScreenUrl === "string" && d.fullScreenUrl.trim().length > 0 ? d.fullScreenUrl.trim() : undefined;

  return {
    id: snapshot.id,
    src: thumb || storageUrl,
    ...(fullScreen ? { fullSrc: fullScreen } : {}),
    ...(width != null && height != null ? { width, height } : {}),
    caption: d.caption ?? "",
    source: "upload",
    albumKey,
    linkedEvent: d.linkedEvent ?? undefined,
    authorName: d.authorDisplayName,
    postTitle: undefined,
    timeLabel: formatFeedTimeLabel(created),
    addedAt: created.getTime(),
    storagePath: d.storagePath,
    uploadedBy: d.authorId,
  };
}

export function subscribeAlbumMedia(
  onItems: (items: AlbumMediaItem[]) => void,
  onError?: (e: Error) => void
) {
  const db = tryGetFirestoreDb();
  if (!db) {
    onItems([]);
    return () => {};
  }
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"), limit(120));
  return onSnapshot(
    q,
    (snap) => onItems(snap.docs.map(mapAlbumMediaDoc)),
    (err) => {
      actionDebug("album", "subscribe error", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

export type AlbumUploadProgress =
  | { phase: "preparing" | "optimizing"; done: number; total: number }
  | { phase: "uploading"; done: number; total: number; percent?: number };

export type CreateAlbumArchiveInput = {
  authorId: string;
  authorDisplayName: string;
  authorPhotoUrl: string | null;
  caption: string;
  albumKey: string;
  linkedEvent?: string | null;
  files: File[];
};

export type AlbumFinalizeOptions = {
  /** Predetermined Firestore doc ids aligned with optimistic UI */
  mediaIds?: string[];
  signal?: AbortSignal;
  trace?: UploadTrace;
  onProgress?: (progress: AlbumUploadProgress) => void;
};

/** CPU-heavy album optimization — call inside {@link enqueueCpuBoundMediaTask} when parallel with other uploads. */
export async function prepareAlbumUploadArtifacts(
  files: File[],
  onProgress?: (progress: AlbumUploadProgress) => void,
  options?: { signal?: AbortSignal; trace?: UploadTrace }
): Promise<ProcessedImageFile[]> {
  for (const file of files) {
    validateRawImageFile(file);
  }
  const total = files.length;
  const { signal, trace } = options ?? {};
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  trace?.("album normalization begins", { segment: "cpu", fileCount: total });
  const optimizedArtifacts = await prepareOptimizedArtifactsForFirebase(files, "album", {
    signal,
    onProgress: (p) => {
      if (!onProgress) return;
      if (p.phase === "optimizing") {
        onProgress({ phase: "optimizing", done: p.done, total });
        return;
      }
      if (p.phase === "ready") return;
      onProgress({ phase: "preparing", done: p.done, total });
    },
  });
  trace?.("album normalization completes", {
    segment: "cpu",
    fileCount: total,
    durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0),
  });
  return optimizedArtifacts;
}

/** Storage uploads + Firestore docs after artifacts are ready (`input.files` unused — pass metadata only). */
export async function finalizeAlbumWritesFromOptimized(
  input: CreateAlbumArchiveInput,
  optimizedArtifacts: ProcessedImageFile[],
  opts?: AlbumFinalizeOptions
): Promise<string[]> {
  if (!input.authorId?.trim()) throw new Error("You must be signed in to upload.");
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");
  if (optimizedArtifacts.length === 0) throw new Error("Choose at least one image.");

  const optimized = optimizedArtifacts.map((a) => a.file);
  const albumMax = getUploadMaxBytes("album");
  for (const file of optimized) {
    if (file.size > albumMax) {
      throw new Error(`"${file.name}" is still too large after optimization. Try fewer photos.`);
    }
  }

  const { mediaIds: presetIds, signal, trace, onProgress } = opts ?? {};

  const itemTotal = optimizedArtifacts.length;

  const ids =
    presetIds && presetIds.length === optimizedArtifacts.length
      ? presetIds
      : optimizedArtifacts.map(() => allocateAlbumMediaDocId());

  opts?.trace?.("album uploads begin", { segment: "storage", itemCount: itemTotal });
  onProgress?.({ phase: "preparing", done: itemTotal, total: itemTotal });
  onProgress?.({ phase: "uploading", done: 0, total: optimizedArtifacts.length, percent: 0 });
  await finalizeAlbumMediaDocuments(input, optimizedArtifacts, ids, onProgress, signal, trace);
  trace?.("album uploads + Firestore complete", { segment: "meta", idCount: ids.length });
  return ids;
}

export function allocateAlbumMediaDocId(): string {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");
  return doc(collection(db, COLLECTION)).id;
}

async function finalizeAlbumMediaDocuments(
  input: CreateAlbumArchiveInput,
  optimizedArtifacts: ProcessedImageFile[],
  mediaIds: string[],
  onProgress?: (progress: AlbumUploadProgress) => void,
  signal?: AbortSignal,
  trace?: UploadTrace
): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");
  const total = optimizedArtifacts.length;

  if (mediaIds.length !== total) {
    throw new Error("Album upload ids must match the number of photos.");
  }

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");
    const id = mediaIds[i]!;
    const ref = doc(db, COLLECTION, id);
    actionDebug("album", "upload begin", { id, index: i });
    uploadStage("album: Storage + Firestore pipeline item", { id, index: i, total });

    const art = optimizedArtifacts[i]!;
    const uploaded = await uploadAlbumImages(
      input.authorId,
      id,
      [art],
      (_done, _total, percent) => {
        onProgress?.({ phase: "uploading", done: i, total, percent });
      },
      signal,
      trace
    );
    const slot = uploaded[0]!;

    try {
      uploadStage("album: firestore sync started", { id, index: i });
      uploadFinalizeTrace("firestore persistence begin", { domain: "album", id, index: i });
      await setDoc(ref, {
        authorId: input.authorId,
        authorDisplayName: input.authorDisplayName,
        authorPhotoUrl: input.authorPhotoUrl ?? null,
        storageUrl: slot.url?.trim() || "",
        storagePath: slot.path,
        caption: input.caption.trim() || "Family memory",
        albumKey: input.albumKey,
        linkedEvent: input.linkedEvent?.trim() || null,
        width: art.width,
        height: art.height,
        originalMimeType: art.originalMime,
        optimizedSizeBytes: art.optimizedSizeBytes,
        processingStatus: slot.processingStatus,
        rawStoragePath: slot.path.startsWith("uploads/raw/") ? slot.path : null,
        thumbnailUrl: null,
        fullScreenUrl: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      uploadFinalizeTrace("firestore persistence success", { domain: "album", id, index: i });
      if (shouldBypassBrowserTransformsForSafariRawDiagnostic()) {
        safariRawDiagnosticLog("firestore persistence success", { id, path: slot.path });
      }
      uploadStage("album: firestore sync complete", { id, index: i });
      uploadFinalizeTrace("optimistic replacement begin", { domain: "album", id });
      uploadFinalizeTrace("optimistic replacement success", { domain: "album", id });
      scheduleAlbumMediaBackgroundUrlHydration(id, slot);
    } catch (e) {
      uploadFinalizeTrace("finalize failed", { domain: "album", id, index: i, error: String(e) });
      const stalled =
        e instanceof Error &&
        (e.message.includes("Timed out") || e.message.includes("offline") || e.message.includes("network"));
      if (stalled) {
        uploadFinalizeTrace("stalled during firestore sync", { domain: "album", id, error: String(e) });
      }
      throw e;
    }
    onProgress?.({ phase: "uploading", done: i + 1, total });
    actionDebug("album", "item saved", { id });
  }

  uploadFinalizeTrace("cleanup begin", { domain: "album", itemCount: total });
  if (shouldUseSimpleIOSWebKitUpload()) {
    safariUploadLog("finalize success", { domain: "album", itemCount: total });
  }
  uploadFinalizeTrace("finalize success", { domain: "album", itemCount: total });
}

function scheduleAlbumMediaBackgroundUrlHydration(mediaId: string, slot: UploadedObject) {
  if (!slot.path.startsWith("uploads/raw/")) return;
  const db = tryGetFirestoreDb();
  if (!db) return;

  const ref = doc(db, COLLECTION, mediaId);
  scheduleBackgroundStorageUrlHydration([{ path: slot.path }], async (_path, url) => {
    try {
      await updateDoc(ref, {
        storageUrl: url,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      uploadFinalizeTrace("background URL hydration firestore patch failed", {
        domain: "album",
        mediaId,
        error: String(e),
      });
    }
  });
}

export async function createAlbumMediaItems(
  input: CreateAlbumArchiveInput,
  onProgress?: (progress: AlbumUploadProgress) => void,
  opts?: {
    /** When provided with same length as `files`, uploads merge into predetermined Firestore ids (optimistic UI). */
    mediaIds?: string[];
    signal?: AbortSignal;
    trace?: UploadTrace;
  }
): Promise<string[]> {
  if (!input.authorId?.trim()) throw new Error("You must be signed in to upload.");
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");
  if (input.files.length === 0) throw new Error("Choose at least one image.");

  const { signal, mediaIds: presetIds, trace } = opts ?? {};
  const artifacts = await prepareAlbumUploadArtifacts(input.files, onProgress, { signal, trace });
  return finalizeAlbumWritesFromOptimized(input, artifacts, {
    mediaIds: presetIds,
    signal,
    trace,
    onProgress,
  });
}

export async function deleteAlbumMediaItem(
  itemId: string,
  viewerUid: string,
  authorId: string,
  storagePath?: string,
  viewerRole?: UserRole | null
) {
  const canModerate = viewerRole === "owner";
  if (viewerUid !== authorId && !canModerate) {
    throw new Error("You don't have permission to remove this photo.");
  }
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable.");
  mobileUploadLog("delete album item — starting", { itemId, hasStoragePath: Boolean(storagePath) });
  await deleteAlbumMediaArtifacts(authorId, itemId, storagePath);
  await deleteDoc(doc(db, COLLECTION, itemId));
  mobileUploadLog("delete album item — Firestore doc removed", { itemId });
}
