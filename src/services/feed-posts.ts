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
  Timestamp,
  updateDoc,
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
import {
  safariRawDiagnosticLog,
  shouldBypassBrowserTransformsForSafariRawDiagnostic,
} from "@/lib/safari-raw-diagnostic";
import { tryGetFirestoreDb } from "@/lib/firebase";
import { mobileUploadLog } from "@/lib/mobile-upload-debug";
import { uploadFinalizeTrace, uploadStage } from "@/lib/upload-log";
import type { UploadTrace } from "@/lib/upload-trace";
import { isPollExpired, pollTotalVotes } from "@/lib/poll-vote-counts";
import { newPollOptionId } from "@/lib/poll-id";
import type { FeedPostCategory } from "@/models/feed-post-category";
import type { FirestorePollData, FirestorePost, PollOption, UiFeedPost, UiPollData } from "@/models/feed-post";
import {
  canDeleteFeedPost,
  type PermissionUser,
} from "@/platform/permissions";
import {
  deletePostMediaArtifacts,
  scheduleBackgroundStorageUrlHydration,
  uploadPostImages,
  type UploadedObject,
} from "@/services/storage-upload";

const POSTS = "posts";
const FIRESTORE_BATCH_LIMIT = 500;

function resolveFeedPostAuthorId(data: Record<string, unknown>): string {
  if (typeof data.authorId === "string" && data.authorId.trim()) return data.authorId.trim();
  if (typeof data.createdBy === "string" && data.createdBy.trim()) return data.createdBy.trim();
  if (typeof data.userId === "string" && data.userId.trim()) return data.userId.trim();
  return "";
}

function isFirestorePermissionDenied(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /permission|PERMISSION_DENIED/i.test(msg);
}

function isFirestoreNotFound(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /not[\s-]?found|NOT_FOUND/i.test(msg);
}

async function commitDeleteBatch(db: NonNullable<ReturnType<typeof tryGetFirestoreDb>>, refs: ReturnType<typeof doc>[]) {
  for (let i = 0; i < refs.length; i += FIRESTORE_BATCH_LIMIT) {
    const slice = refs.slice(i, i + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(db);
    slice.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

function feedMediaSlotCount(d: Partial<FirestorePost>): number {
  const urls = Array.isArray(d.mediaUrls) ? d.mediaUrls : [];
  const meta = Array.isArray(d.mediaMeta) ? d.mediaMeta : [];
  return Math.max(urls.length, meta.length);
}

function resolveFeedMediaDisplayUrl(d: Partial<FirestorePost>, index: number): string {
  const urls = Array.isArray(d.mediaUrls) ? d.mediaUrls : [];
  const direct = typeof urls[index] === "string" ? urls[index]!.trim() : "";
  if (direct) return direct;
  const meta = Array.isArray(d.mediaMeta) ? d.mediaMeta : [];
  const m = meta[index];
  const feed = typeof m?.feedUrl === "string" ? m.feedUrl.trim() : "";
  if (feed) return feed;
  const thumb = typeof m?.thumbnailUrl === "string" ? m.thumbnailUrl.trim() : "";
  if (thumb) return thumb;
  return "";
}

function mapPollData(raw: unknown): UiPollData | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Partial<FirestorePollData>;
  const question = typeof p.question === "string" ? p.question.trim() : "";
  if (!question) return undefined;

  const options: PollOption[] = Array.isArray(p.options)
    ? p.options
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const o = row as Partial<PollOption>;
          const id = typeof o.id === "string" ? o.id.trim() : "";
          const text = typeof o.text === "string" ? o.text.trim() : "";
          if (!id || !text) return null;
          const voteCount = typeof o.voteCount === "number" && o.voteCount >= 0 ? o.voteCount : 0;
          return { id, text, voteCount };
        })
        .filter((o): o is PollOption => o != null)
    : [];

  if (options.length < 2) return undefined;

  const expiresAt = p.expiresAt as { toDate?: () => Date } | null | undefined;
  const expiresAtMs = expiresAt?.toDate?.() ? expiresAt.toDate()!.getTime() : null;

  return {
    question,
    options,
    allowMultiple: Boolean(p.allowMultiple),
    expiresAtMs,
    expired: isPollExpired(expiresAtMs),
    totalVotes: pollTotalVotes(options),
  };
}

/** Remote post is display-ready when persisted media has a resolvable URL (or is text-only / poll). */
export function isFeedPostMediaDisplayReady(post: UiFeedPost): boolean {
  if (post.kind === "poll") return true;
  if (post.kind === "text") return true;
  if (post.kind === "album") return (post.album ?? []).some((u) => u.length > 0);
  return Boolean(post.cover?.trim());
}

function mapDoc(snapshot: QueryDocumentSnapshot<DocumentData>): UiFeedPost {
  const d = snapshot.data() as Partial<FirestorePost>;
  const created = d.createdAt?.toDate?.() ?? new Date();
  const contentType =
    d.contentType === "poll" || d.category === "poll" ? "poll" : "standard";
  const poll = contentType === "poll" ? mapPollData(d.poll) : undefined;

  if (contentType === "poll" && poll) {
    const reactionCounts = normalizeReactionCounts(d.reactionCounts);
    return {
      id: snapshot.id,
      authorId: resolveFeedPostAuthorId(d as Record<string, unknown>),
      contentType: "poll",
      category: "poll",
      layout: "standard",
      author: {
        name: d.authorDisplayName ?? "Member",
        handle: handleFromDisplayName(d.authorDisplayName ?? "member"),
        avatar: d.authorPhotoUrl ?? "",
      },
      timeLabel: formatFeedTimeLabel(created),
      location: d.location ?? undefined,
      title: d.title ?? undefined,
      body: d.body ?? poll.question,
      kind: "poll",
      poll,
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

  const slotCount = feedMediaSlotCount(d);
  const media = Array.from({ length: slotCount }, (_, i) => resolveFeedMediaDisplayUrl(d, i));
  let kind: UiFeedPost["kind"];
  if (slotCount === 0) kind = "text";
  else if (slotCount === 1) kind = d.category === "weekend_recap" ? "event_recap" : "image";
  else kind = "album";

  const layout: UiFeedPost["layout"] =
    kind === "image" && d.category === "wildlife"
      ? "hero"
      : kind === "album" && slotCount >= 3
        ? "tall"
        : "standard";

  const cover =
    kind === "image" || kind === "event_recap"
      ? media[0]?.trim()
        ? media[0]
        : undefined
      : undefined;
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
    authorId: resolveFeedPostAuthorId(d as Record<string, unknown>),
    contentType: "standard",
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
    album: kind === "album" ? media.filter((u) => u.length > 0) : undefined,
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

export type CreatePollFeedPostInput = {
  authorId: string;
  authorDisplayName: string;
  authorPhotoUrl: string | null;
  question: string;
  optionTexts: string[];
  allowMultiple: boolean;
  expiresAt?: Date | null;
  location?: string;
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
  let uploadedSlots: UploadedObject[] = [];

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
    uploadedSlots = await uploadPostImages(
      input.authorId,
      postId,
      optimizedArtifacts,
      (done, t, percent) => onProgress?.({ phase: "uploading", done, total: t, percent }),
      signal,
      trace
    );
    mediaUrls = uploadedSlots.map((u) => u.url?.trim() || "");
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
    uploadFinalizeTrace("firestore persistence begin", { postId, hasMedia: optimizedArtifacts.length > 0 });
    uploadStage("firestore sync started", { postId });
    await setDoc(ref, payload);
    uploadFinalizeTrace("firestore persistence success", {
      postId,
      durationMs: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - fsT0),
    });
    if (shouldBypassBrowserTransformsForSafariRawDiagnostic()) {
      safariRawDiagnosticLog("firestore persistence success", { postId, hasMedia: optimizedArtifacts.length > 0 });
    }
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

  if (uploadedSlots.length > 0) {
    scheduleFeedPostBackgroundUrlHydration(postId, uploadedSlots);
  }
}

function scheduleFeedPostBackgroundUrlHydration(postId: string, uploadedSlots: UploadedObject[]) {
  const rawSlots = uploadedSlots.filter((s) => s.path.startsWith("uploads/raw/"));
  if (rawSlots.length === 0) return;

  const db = tryGetFirestoreDb();
  if (!db) return;

  const ref = doc(db, POSTS, postId);
  const resolvedByPath = new Map<string, string>();

  scheduleBackgroundStorageUrlHydration(rawSlots, async (path, url) => {
    resolvedByPath.set(path, url);
    const ordered = uploadedSlots.map((s) => resolvedByPath.get(s.path) ?? s.url?.trim() ?? "");
    if (!ordered.some((u) => u.length > 0)) return;
    try {
      await updateDoc(ref, {
        mediaUrls: ordered,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      uploadFinalizeTrace("background URL hydration firestore patch failed", { postId, error: String(e) });
    }
  });
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

export async function createPollFeedPost(postId: string, input: CreatePollFeedPostInput): Promise<void> {
  if (!input.authorId?.trim()) throw new Error("You must be signed in to publish.");

  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");

  const question = input.question.trim();
  if (!question) throw new Error("Add a poll question.");

  const texts = input.optionTexts.map((t) => t.trim()).filter(Boolean);
  if (texts.length < 2) throw new Error("Add at least two poll options.");
  if (texts.length > 6) throw new Error("Polls support up to six options.");

  const options: PollOption[] = texts.map((text) => ({
    id: newPollOptionId(),
    text,
    voteCount: 0,
  }));

  const poll: FirestorePollData = {
    question,
    options,
    allowMultiple: input.allowMultiple,
    expiresAt:
      input.expiresAt && input.expiresAt.getTime() > Date.now()
        ? Timestamp.fromDate(input.expiresAt)
        : null,
  };

  const ref = doc(db, POSTS, postId);
  const payload: Record<string, unknown> = {
    authorId: input.authorId,
    authorDisplayName: input.authorDisplayName,
    authorPhotoUrl: input.authorPhotoUrl ?? null,
    contentType: "poll",
    category: "poll",
    title: null,
    body: question,
    location: input.location?.trim() || null,
    linkedEvent: null,
    mediaUrls: [],
    poll,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    commentCount: 0,
    reactionCounts: {},
  };

  try {
    await setDoc(ref, payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
      throw new Error("Could not save the poll. Check that you are signed in and Firestore rules allow writes.");
    }
    throw new Error(`Could not save the poll. ${msg}`);
  }
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
  viewer: PermissionUser,
  authorId: string,
  mediaUrls: string[] = []
) {
  if (!canDeleteFeedPost(viewer, { authorId })) {
    throw new Error("You do not have permission to delete this post.");
  }

  mobileUploadLog("delete feed post — starting Firestore batch", { postId, mediaCount: mediaUrls.length });
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");

  try {
    const [reactionsSnap, commentsSnap, pollVotesSnap] = await Promise.all([
      getDocs(collection(db, POSTS, postId, "reactions")),
      getDocs(collection(db, POSTS, postId, "comments")),
      getDocs(collection(db, POSTS, postId, "pollVotes")),
    ]);

    const refs = [
      ...reactionsSnap.docs.map((d) => d.ref),
      ...commentsSnap.docs.map((d) => d.ref),
      ...pollVotesSnap.docs.map((d) => d.ref),
      doc(db, POSTS, postId),
    ];

    await commitDeleteBatch(db, refs);
  } catch (e) {
    if (isFirestorePermissionDenied(e)) {
      throw new Error("You do not have permission to delete this post.");
    }
    if (isFirestoreNotFound(e)) {
      throw new Error("This post was already deleted.");
    }
    throw new Error(e instanceof Error ? e.message : "Could not delete post. Try again.");
  }

  mobileUploadLog("delete feed post — Firestore committed", { postId });

  if (mediaUrls.length > 0) {
    try {
      await deletePostMediaArtifacts(authorId, postId, mediaUrls);
      mobileUploadLog("delete feed post — Storage cleanup settled", { postId });
    } catch (e) {
      mobileUploadLog("delete feed post — Storage cleanup failed (post already removed)", {
        postId,
        error: String(e),
      });
    }
  }
}
