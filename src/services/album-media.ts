import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
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
import type { AlbumMediaItem } from "@/lib/photo-album-media";
import { tryGetFirestoreDb } from "@/lib/firebase";
import type { FirestoreAlbumMedia } from "@/models/album-media";
import { uploadAlbumImages, deleteStoragePath } from "@/services/storage-upload";

const COLLECTION = "albumMedia";

function mapAlbumMediaDoc(snapshot: QueryDocumentSnapshot<DocumentData>): AlbumMediaItem {
  const d = snapshot.data() as Partial<FirestoreAlbumMedia>;
  const created = d.createdAt?.toDate?.() ?? new Date();
  const albumKey = typeof d.albumKey === "string" ? d.albumKey : "general";
  const width = typeof d.width === "number" && d.width > 0 ? d.width : undefined;
  const height = typeof d.height === "number" && d.height > 0 ? d.height : undefined;

  return {
    id: snapshot.id,
    src: d.storageUrl ?? "",
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

export function allocateAlbumMediaDocId(): string {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");
  return doc(collection(db, COLLECTION)).id;
}

async function finalizeAlbumMediaDocuments(
  input: CreateAlbumArchiveInput,
  optimizedArtifacts: ProcessedImageFile[],
  mediaIds: string[],
  onProgress?: (progress: AlbumUploadProgress) => void
): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");
  const total = optimizedArtifacts.length;

  if (mediaIds.length !== total) {
    throw new Error("Album upload ids must match the number of photos.");
  }

  for (let i = 0; i < total; i++) {
    const file = optimizedArtifacts[i]!.file;
    const id = mediaIds[i]!;
    const ref = doc(db, COLLECTION, id);
    actionDebug("album", "upload begin", { id, index: i });

    const art = optimizedArtifacts[i]!;
    const uploaded = await uploadAlbumImages(id, [file], (_done, _total, percent) => {
      onProgress?.({ phase: "uploading", done: i, total, percent });
    });
    const { url, path } = uploaded[0]!;

    await setDoc(ref, {
      authorId: input.authorId,
      authorDisplayName: input.authorDisplayName,
      authorPhotoUrl: input.authorPhotoUrl ?? null,
      storageUrl: url,
      storagePath: path,
      caption: input.caption.trim() || "Family memory",
      albumKey: input.albumKey,
      linkedEvent: input.linkedEvent?.trim() || null,
      width: art.width,
      height: art.height,
      originalMimeType: art.originalMime,
      optimizedSizeBytes: art.optimizedSizeBytes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    onProgress?.({ phase: "uploading", done: i + 1, total });
    actionDebug("album", "item saved", { id });
  }
}

export async function createAlbumMediaItems(
  input: CreateAlbumArchiveInput,
  onProgress?: (progress: AlbumUploadProgress) => void,
  opts?: {
    /** When provided with same length as `files`, uploads merge into predetermined Firestore ids (optimistic UI). */
    mediaIds?: string[];
    signal?: AbortSignal;
  }
): Promise<string[]> {
  if (!input.authorId?.trim()) throw new Error("You must be signed in to upload.");
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");
  if (input.files.length === 0) throw new Error("Choose at least one image.");

  for (const file of input.files) {
    validateRawImageFile(file);
  }

  const total = input.files.length;
  const { signal, mediaIds: presetIds } = opts ?? {};

  const optimizedArtifacts = await prepareOptimizedArtifactsForFirebase(input.files, "album", {
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

  const optimized = optimizedArtifacts.map((a) => a.file);

  const albumMax = getUploadMaxBytes("album");
  for (const file of optimized) {
    if (file.size > albumMax) {
      throw new Error(`"${file.name}" is still too large after optimization. Try fewer photos.`);
    }
  }

  const ids =
    presetIds && presetIds.length === optimizedArtifacts.length
      ? presetIds
      : optimizedArtifacts.map(() => allocateAlbumMediaDocId());

  onProgress?.({ phase: "preparing", done: total, total });
  onProgress?.({ phase: "uploading", done: 0, total: optimizedArtifacts.length, percent: 0 });
  await finalizeAlbumMediaDocuments(input, optimizedArtifacts, ids, onProgress);
  return ids;
}

export async function deleteAlbumMediaItem(
  itemId: string,
  viewerUid: string,
  authorId: string,
  storagePath?: string
) {
  if (viewerUid !== authorId) throw new Error("Only the uploader can remove this memory.");
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable.");
  await deleteDoc(doc(db, COLLECTION, itemId));
  if (storagePath) {
    try {
      await deleteStoragePath(storagePath);
    } catch (e) {
      actionDebug("album", "storage cleanup failed", e);
    }
  }
}
