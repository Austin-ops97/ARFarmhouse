import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { actionDebug } from "@/lib/action-debug";
import { formatFeedTimeLabel, handleFromDisplayName } from "@/lib/datetime/relative";
import { buildChipsFromCounts, normalizeReactionCounts } from "@/lib/reaction-counts";
import { validateFeedImageFiles, validateOptimizedFeedFiles } from "@/lib/feed-publish";
import { prepareImagesForUpload } from "@/lib/image-upload-pipeline";
import { tryGetFirestoreDb } from "@/lib/firebase";
import type { FeedPostCategory } from "@/models/feed-post-category";
import type { FirestorePost, UiFeedPost } from "@/models/feed-post";
import { deletePostMediaStorage, uploadPostImages } from "@/services/storage-upload";

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
  const reactionCounts = normalizeReactionCounts(d.reactionCounts);

  return {
    id: snapshot.id,
    authorId: typeof d.authorId === "string" ? d.authorId : "",
    category: (d.category as FeedPostCategory) ?? "update",
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
    reactions: buildChipsFromCounts(reactionCounts, undefined).map((c) => ({
      emoji: c.emoji,
      count: c.count,
      active: c.active,
    })),
    reactionCounts,
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
      actionDebug("feed", "subscribe error", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

export type FeedPublishProgress =
  | { phase: "optimizing"; done: number; total: number }
  | { phase: "uploading"; done: number; total: number; percent?: number };

export async function createFeedPostWithMedia(
  input: {
    authorId: string;
    authorDisplayName: string;
    authorPhotoUrl: string | null;
    category: FeedPostCategory;
    title?: string;
    body: string;
    location?: string;
    linkedEvent?: string | null;
    files: File[];
  },
  onProgress?: (progress: FeedPublishProgress) => void
): Promise<string> {
  if (!input.authorId?.trim()) throw new Error("You must be signed in to publish.");

  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");

  validateFeedImageFiles(input.files);

  const ref = doc(collection(db, POSTS));
  const id = ref.id;
  actionDebug("feed", "publish start", { postId: id, fileCount: input.files.length });

  let mediaUrls: string[] = [];
  if (input.files.length > 0) {
    const total = input.files.length;
    onProgress?.({ phase: "optimizing", done: 0, total });
    actionDebug("feed", "optimize begin");
    const optimized = await prepareImagesForUpload(input.files, "feed", {
      onProgress: (p) => {
        if (p.phase === "optimizing") {
          onProgress?.({ phase: "optimizing", done: p.done, total: p.total });
        }
      },
    });
    validateOptimizedFeedFiles(optimized);
    actionDebug("feed", "upload begin");
    onProgress?.({ phase: "uploading", done: 0, total: optimized.length, percent: 0 });
    mediaUrls = await uploadPostImages(id, optimized, (done, t, percent) =>
      onProgress?.({ phase: "uploading", done, total: t, percent })
    );
    actionDebug("feed", "upload complete", { count: mediaUrls.length });
  }

  const payload: Record<string, unknown> = {
    authorId: input.authorId,
    authorDisplayName: input.authorDisplayName,
    authorPhotoUrl: input.authorPhotoUrl ?? null,
    category: input.category,
    title: input.title?.trim() || null,
    body: input.body.trim(),
    location: input.location?.trim() || null,
    linkedEvent: input.linkedEvent?.trim() || null,
    mediaUrls,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    commentCount: 0,
    reactionCounts: {},
  };

  try {
    actionDebug("feed", "firestore write begin", { postId: id });
    await setDoc(ref, payload);
    actionDebug("feed", "firestore write complete", { postId: id });
    return id;
  } catch (e) {
    actionDebug("feed", "publish failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
      throw new Error("Could not save the post. Check that you are signed in and Firestore rules allow writes.");
    }
    throw new Error(`Could not save the post. ${msg}`);
  }
}

export async function deleteFeedPost(
  postId: string,
  viewerUid: string,
  authorId: string,
  mediaUrls: string[] = []
) {
  if (viewerUid !== authorId) throw new Error("Only the author can delete this post.");
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const batch = writeBatch(db);
  const [reactionsSnap, commentsSnap] = await Promise.all([
    getDocs(collection(db, POSTS, postId, "reactions")),
    getDocs(collection(db, POSTS, postId, "comments")),
  ]);
  reactionsSnap.forEach((d) => batch.delete(d.ref));
  commentsSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, POSTS, postId));
  await batch.commit();
  if (mediaUrls.length > 0) {
    await deletePostMediaStorage(postId, mediaUrls);
  }
}
