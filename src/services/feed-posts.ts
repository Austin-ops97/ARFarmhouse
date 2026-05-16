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
import type { ProcessedImageFile } from "@/lib/image-process";
import { prepareOptimizedArtifactsForFirebase } from "@/lib/image-upload-pipeline";
import { safariUploadLog, shouldUseSimpleIOSWebKitUpload } from "@/lib/ios-webkit-upload-transport";
import { tryGetFirestoreDb } from "@/lib/firebase";
import { mobileUploadLog } from "@/lib/mobile-upload-debug";
import { uploadFinalizeTrace, uploadStage } from "@/lib/upload-log";
import type { UploadTrace } from "@/lib/upload-trace";
import type { FeedPostCategory } from "@/models/feed-post-category";
import type { FirestorePost, UiFeedPost } from "@/models/feed-post";
import { deletePostMediaArtifacts, uploadPostImages } from "@/services/storage-upload";

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

  const mediaFullUrls = media.map((_, i) => {
    const m = Array.isArray(d.mediaMeta) ? d.mediaMeta[i] : undefined;
    const fu = typeof m?.fullUrl === "string" && m.fullUrl.length > 0 ? m.fullUrl : undefined;
    return fu;
  });
  const hasFull = mediaFullUrls.some((x) => typeof x === "string");

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
    ...(hasFull ? { mediaFullUrls } : {}),
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

export type FeedFinalizeOptions = {
  onProgress?: (progress: FeedPublishProgress) => void;
  signal?: AbortSignal;
  trace?: UploadTrace;
};

/** CPU-only: validate + optimize images for a feed post (queue this separately from Storage). */
export async function prepareFeedPostPublishingArtifacts(
  files: File[],
  options?: FeedFinalizeOptions
): Promise<ProcessedImageFile[]> {
  validateFeedImageFiles(files);
  const total = files.length;
  const { onProgress, signal, trace } = options ?? {};
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    trace?.("normalization begins", { segment: "cpu", fileCount: total });
  actionDebug("feed", "optimize begin");
  const optimizedArtifacts = await prepareOptimizedArtifactsForFirebase(files, "feed", {
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
  trace?.("normalization completes", {
    segment: "cpu",
    fileCount: total,
    durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0),
    normalizedBytes: optimizedArtifacts.reduce((n, a) => n + a.optimizedSizeBytes, 0),
  });
  return optimizedArtifacts;
}

/** Storage + Firestore after optimization (or text-only with `optimizedArtifacts: []`). */
export async function finalizeFeedPostFromOptimizedArtifacts(
  postId: string,
  input: CreateFeedPostInput,
  optimizedArtifacts: ProcessedImageFile[],
  options?: FeedFinalizeOptions
): Promise<void> {
  if (!input.authorId?.trim()) throw new Error("You must be signed in to publish.");

  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");

  const ref = doc(db, POSTS, postId);
  const { onProgress, signal, trace } = options ?? {};

  let mediaUrls: string[] = [];
  let mediaMeta: NonNullable<FirestorePost["mediaMeta"]> | undefined;

  if (optimizedArtifacts.length > 0) {
    const optimized = optimizedArtifacts.map((a) => a.file);
    validateOptimizedFeedFiles(optimized);
    const uploadT0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    trace?.("upload to Storage begins", {
      segment: "storage",
      fileCount: optimized.length,
      bytes: optimized.reduce((n, f) => n + f.size, 0),
    });
    actionDebug("feed", "upload begin");
    uploadStage("firestore sync — upload to Storage starting", { postId, fileCount: optimized.length });
    onProgress?.({ phase: "uploading", done: 0, total: optimized.length, percent: 0 });
    const uploadedSlots = await uploadPostImages(
      input.authorId,
      postId,
      optimizedArtifacts,
      (done, t, percent) => onProgress?.({ phase: "uploading", done, total: t, percent }),
      signal,
      trace
    );
    mediaUrls = uploadedSlots.map((u) => u.url);
    mediaMeta = optimizedArtifacts.map((a, i) => ({
      width: a.width,
      height: a.height,
      originalMime: a.originalMime,
      optimizedSizeBytes: a.optimizedSizeBytes,
      skippedOptimization: a.skippedOptimization,
      processingStatus: uploadedSlots[i]?.processingStatus ?? "processing",
      rawStoragePath: (() => {
        const p = uploadedSlots[i]?.path ?? "";
        return p.startsWith("uploads/raw/") ? p : null;
      })(),
      thumbnailUrl: null,
      feedUrl: null,
      fullUrl: null,
    }));
    trace?.("upload to Storage completes", {
      segment: "storage",
      durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - uploadT0),
      urlCount: mediaUrls.length,
    });
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

  const fsT0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    if (signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");
    actionDebug("feed", "firestore write begin", { postId });
    trace?.("Firestore setDoc begins", { segment: "firestore", postId });
    uploadFinalizeTrace("firestore write begin", { postId, hasMedia: optimizedArtifacts.length > 0 });
    uploadStage("firestore sync started", { postId });
    await setDoc(ref, payload);
    uploadFinalizeTrace("firestore write success", {
      postId,
      durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - fsT0),
    });
    trace?.("Firestore setDoc completes", {
      segment: "firestore",
      postId,
      durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - fsT0),
    });
    uploadStage("firestore sync complete", { postId });
    actionDebug("feed", "firestore write complete", { postId });
    uploadFinalizeTrace("optimistic replacement begin", {
      postId,
      note: "server doc written — snapshot will drop optimistic row",
    });
    uploadFinalizeTrace("optimistic replacement success", { postId });
    uploadFinalizeTrace("cleanup begin", { postId });
  } catch (e) {
    actionDebug("feed", "publish failed", e);
    uploadFinalizeTrace("finalize failed", { postId, stage: "firestore", error: String(e) });
    const stalled =
      e instanceof Error &&
      (e.message.includes("Timed out") || e.message.includes("offline") || e.message.includes("network"));
    if (stalled) {
      uploadFinalizeTrace("stalled during firestore sync", { postId, error: String(e) });
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
      throw new Error("Could not save the post. Check that you are signed in and Firestore rules allow writes.");
    }
    throw new Error(`Could not save the post. ${msg}`);
  }
  uploadFinalizeTrace("finalize success", { postId, domain: "feed" });
  uploadStage("finalize success — post published", { postId });
  trace?.("finalize success — post published", { segment: "meta", postId });
  if (shouldUseSimpleIOSWebKitUpload()) {
    safariUploadLog("finalize success", { postId, domain: "feed" });
  }
}

/**
 * Runs validate → optimize → Storage (resumable) → Firestore for an existing post id.
 * Used by optimistic publishing: UI appears immediately, then this finishes in the background.
 */
export async function finalizeFeedPostFromFiles(
  postId: string,
  input: CreateFeedPostInput,
  options?: FeedFinalizeOptions
): Promise<void> {
  validateFeedImageFiles(input.files);

  actionDebug("feed", "publish finalize start", { postId, fileCount: input.files.length });

  const optimizedArtifacts =
    input.files.length > 0 ? await prepareFeedPostPublishingArtifacts(input.files, options) : [];

  await finalizeFeedPostFromOptimizedArtifacts(postId, input, optimizedArtifacts, options);
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
  mobileUploadLog("delete feed post — starting Firestore batch", { postId, mediaCount: mediaUrls.length });
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
  mobileUploadLog("delete feed post — Firestore committed", { postId });
  if (mediaUrls.length > 0) {
    await deletePostMediaArtifacts(authorId, postId, mediaUrls);
    mobileUploadLog("delete feed post — Storage cleanup settled", { postId });
  }
}
