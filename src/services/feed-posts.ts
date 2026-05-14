import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { formatFeedTimeLabel, handleFromDisplayName } from "@/lib/datetime/relative";
import { tryGetFirestoreDb } from "@/lib/firebase/client";
import type { DemoPostCategory } from "@/lib/social-demo";
import type { FirestorePost, UiFeedPost } from "@/models/feed-post";
import { uploadPostImages } from "@/services/storage-upload";

const POSTS = "posts";

function mapDoc(snapshot: QueryDocumentSnapshot<DocumentData>): UiFeedPost {
  const d = snapshot.data() as Partial<FirestorePost>;
  const created = d.createdAt?.toDate?.() ?? new Date();
  const media = Array.isArray(d.mediaUrls) ? d.mediaUrls : [];
  let kind: UiFeedPost["kind"];
  if (media.length === 0) kind = "text";
  else if (media.length === 1) kind = d.category === "weekend_recap" ? "event_recap" : "image";
  else kind = "album";

  const layout: UiFeedPost["layout"] =
    kind === "image" && d.category === "wildlife" ? "hero" : kind === "album" && media.length >= 3 ? "tall" : "standard";

  const cover = kind === "image" || kind === "event_recap" ? media[0] : undefined;

  return {
    id: snapshot.id,
    category: (d.category as DemoPostCategory) ?? "update",
    layout,
    author: {
      name: d.authorDisplayName ?? "Member",
      handle: handleFromDisplayName(d.authorDisplayName ?? "member"),
      avatar: d.authorPhotoUrl ?? "",
    },
    timeLabel: formatFeedTimeLabel(created),
    location: d.location ?? undefined,
    title: d.title ?? undefined,
    body: d.body ?? "",
    kind,
    cover,
    album: kind === "album" ? media : undefined,
    linkedEvent: d.linkedEvent ?? undefined,
    reactions: [],
    commentsPreview: [],
    commentCount: typeof d.commentCount === "number" ? d.commentCount : 0,
  };
}

export function subscribeFeedPosts(onPosts: (posts: UiFeedPost[]) => void, onError?: (e: Error) => void) {
  const db = tryGetFirestoreDb();
  if (!db) {
    onPosts([]);
    return () => {};
  }
  const q = query(collection(db, POSTS), orderBy("createdAt", "desc"), limit(48));
  return onSnapshot(
    q,
    (snap) => {
      onPosts(snap.docs.map(mapDoc));
    },
    (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

export async function createFeedPost(input: {
  authorId: string;
  authorDisplayName: string;
  authorPhotoUrl: string | null;
  category: DemoPostCategory;
  title?: string;
  body: string;
  location?: string;
  linkedEvent?: string | null;
  mediaUrls: string[];
}) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const ref = doc(collection(db, POSTS));
  const payload: Record<string, unknown> = {
    authorId: input.authorId,
    authorDisplayName: input.authorDisplayName,
    authorPhotoUrl: input.authorPhotoUrl,
    category: input.category,
    title: input.title?.trim() || null,
    body: input.body.trim(),
    location: input.location?.trim() || null,
    linkedEvent: input.linkedEvent?.trim() || null,
    mediaUrls: input.mediaUrls,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    commentCount: 0,
  };
  await setDoc(ref, payload);
  return ref.id;
}

export async function createFeedPostWithMedia(
  input: {
    authorId: string;
    authorDisplayName: string;
    authorPhotoUrl: string | null;
    category: DemoPostCategory;
    title?: string;
    body: string;
    location?: string;
    linkedEvent?: string | null;
    files: File[];
  },
  onUploadProgress?: (done: number, total: number) => void
) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const ref = doc(collection(db, POSTS));
  const id = ref.id;
  const mediaUrls =
    input.files.length > 0 ? await uploadPostImages(id, input.files, onUploadProgress) : [];
  const payload: Record<string, unknown> = {
    authorId: input.authorId,
    authorDisplayName: input.authorDisplayName,
    authorPhotoUrl: input.authorPhotoUrl,
    category: input.category,
    title: input.title?.trim() || null,
    body: input.body.trim(),
    location: input.location?.trim() || null,
    linkedEvent: input.linkedEvent?.trim() || null,
    mediaUrls,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    commentCount: 0,
  };
  await setDoc(ref, payload);
  return id;
}
