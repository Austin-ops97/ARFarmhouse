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
import type { AlbumMediaItem } from "@/lib/photo-album-media";
import { tryGetFirestoreDb } from "@/lib/firebase";
import type { FirestoreAlbumMedia } from "@/models/album-media";
import { uploadAlbumImages, deleteStoragePath } from "@/services/storage-upload";

const COLLECTION = "albumMedia";

function mapAlbumMediaDoc(snapshot: QueryDocumentSnapshot<DocumentData>): AlbumMediaItem {
  const d = snapshot.data() as Partial<FirestoreAlbumMedia>;
  const created = d.createdAt?.toDate?.() ?? new Date();
  const albumKey = typeof d.albumKey === "string" ? d.albumKey : "general";
  return {
    id: snapshot.id,
    src: d.storageUrl ?? "",
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

export async function createAlbumMediaItems(
  input: {
    authorId: string;
    authorDisplayName: string;
    authorPhotoUrl: string | null;
    caption: string;
    albumKey: string;
    linkedEvent?: string | null;
    files: File[];
  },
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  if (!input.authorId?.trim()) throw new Error("You must be signed in to upload.");
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");
  if (input.files.length === 0) throw new Error("Choose at least one image.");

  const ids: string[] = [];
  const total = input.files.length;

  for (let i = 0; i < input.files.length; i++) {
    const file = input.files[i]!;
    const ref = doc(collection(db, COLLECTION));
    const id = ref.id;
    actionDebug("album", "upload begin", { id, index: i });

    const uploaded = await uploadAlbumImages(id, [file], (done) => onProgress?.(done, total));
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    ids.push(id);
    onProgress?.(i + 1, total);
    actionDebug("album", "item saved", { id });
  }

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
