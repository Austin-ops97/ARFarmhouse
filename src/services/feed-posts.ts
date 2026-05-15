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
import { prepareOptimizedArtifactsForFirebase } from "@/lib/image-upload-pipeline";
import { tryGetFirestoreDb } from "@/lib/firebase";
import { uploadStage } from "@/lib/upload-log";
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

  const mediaDimensions: UiFeedPost["mediaDimensions"] = media.map((_, i) => {
    const m = Array.isArray(d.mediaMeta) ? d.mediaMeta[i] : undefined;
    const width = typeof m?.width === "number" ? m.width : undefined;
    const height = typeof m?.height === "number" ? m.height : undefined;
    if (width === undefined || height === undefined || width <= 0 || height <= 0) return undefined;
    return { width, height };
  });

  const hasDims = mediaDimensions.some((x) => x != null);

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
    ...(hasDims ? { mediaDimensions } : {}),
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
  | { phase: "preparing" | "optimizing"; done: number; total: number }
  | { phase: "uploading"; done: number; total: number; percent?: number };

export type CreateFeedPostInput = {
  authorId: string;
  authorDisplayName: string;
  authorPhotoUrl: string | null;
  category: FeedPostCategory;
  title?: string;
  body: string;
  location?: string;
  linkedEvent?: string | null;
  files: File[];
};

/** Reserve a Firestore document id before optimistic UI so Storage paths and the final `setDoc` stay aligned. */
export function allocateFeedPostDocId(): string {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");
  return doc(collection(db, POSTS)).id;
}

/**
 * Runs validate → optimize → Storage (resumable) → Firestore for an existing post id.
 * Used by optimistic publishing: UI appears immediately, then this finishes in the background.
 */
export async function finalizeFeedPostFromFiles(
  postId: string,
  input: CreateFeedPostInput,
  options?: {
    onProgress?: (progress: FeedPublishProgress) => void;
    signal?: AbortSignal;
  }
): Promise<void> {
  if (!input.authorId?.trim()) throw new Error("You must be signed in to publish.");

  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");

  validateFeedImageFiles(input.files);

  const ref = doc(db, POSTS, postId);
  actionDebug("feed", "publish finalize start", { postId, fileCount: input.files.length });

  let mediaUrls: string[] = [];
  let mediaMeta: NonNullable<FirestorePost["mediaMeta"]> | undefined;

  if (input.files.length > 0) {
    const total = input.files.length;
    const { onProgress, signal } = options ?? {};
    actionDebug("feed", "optimize begin");
    const optimizedArtifacts = await prepareOptimizedArtifactsForFirebase(input.files, "feed", {
      signal,
      onProgress: (pipe) => {
        if (!onProgress) return;
        if (pipe.phase === "optimizing") {
          onProgress({ phase: "optimizing", done: pipe.done, total });
          return;
        }
        if (pipe.phase === "ready") return;
        onProgress({ phase: "preparing", done: pipe.done, total });
      },
    });
    const optimized = optimizedArtifacts.map((a) => a.file);
    validateOptimizedFeedFiles(optimized);
    mediaMeta = optimizedArtifacts.map((a) => ({
      width: a.width,
      height: a.height,
      originalMime: a.originalMime,
      optimizedSizeBytes: a.optimizedSizeBytes,
      skippedOptimization: a.skippedOptimization,
    }));
    actionDebug("feed", "upload begin");
    uploadStage("firestore sync — upload to Storage starting", { postId, fileCount: optimized.length });
    options?.onProgress?.({ phase: "uploading", done: 0, total: optimized.length, percent: 0 });
    mediaUrls = await uploadPostImages(
      postId,
      optimized,
      (done, t, percent) => options?.onProgress?.({ phase: "uploading", done, total: t, percent }),
      signal
    );
    actionDebug("feed", "upload complete", { count: mediaUrls.length });
    uploadStage("firestore sync — Storage complete, writing post document", { postId, mediaCount: mediaUrls.length });
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
    ...(mediaMeta && mediaMeta.length > 0 ? { mediaMeta } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    commentCount: 0,
    reactionCounts: {},
  };

  try {
    if (options?.signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");
    actionDebug("feed", "firestore write begin", { postId });
    uploadStage("firestore sync started", { postId });
    await setDoc(ref, payload);
    uploadStage("firestore sync complete", { postId });
    actionDebug("feed", "firestore write complete", { postId });
  } catch (e) {
    actionDebug("feed", "publish failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
      throw new Error("Could not save the post. Check that you are signed in and Firestore rules allow writes.");
    }
    throw new Error(`Could not save the post. ${msg}`);
  }
  uploadStage("finalize success — post published", { postId });
}

export async function createFeedPostWithMedia(
  input: CreateFeedPostInput,
  onProgress?: (progress: FeedPublishProgress) => void
): Promise<string> {
  const id = allocateFeedPostDocId();
  await finalizeFeedPostFromFiles(id, input, { onProgress });
  return id;
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
