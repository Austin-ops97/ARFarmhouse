import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { computeReactionCountsUpdate, normalizeReactionCounts } from "@/lib/reaction-counts";
import { formatFeedTimeLabel } from "@/lib/datetime/relative";
import { tryGetFirestoreDb } from "@/lib/firebase";
import { buildChipsFromCounts } from "@/lib/reaction-counts";

const DEFAULT_EMOJIS = ["❤️", "👏", "🔥"] as const;

export type ReactionChip = { emoji: string; count: number; active: boolean };

export function previewReactionAfterToggle(chips: ReactionChip[], tapEmoji: string): ReactionChip[] {
  const mine = chips.find((c) => c.active)?.emoji;
  const counts: Record<string, number> = {};
  for (const c of chips) counts[c.emoji] = c.count;
  const { counts: nextCounts, nextUserEmoji } = computeReactionCountsUpdate(counts, mine, tapEmoji);
  return buildChipsFromCounts(nextCounts, nextUserEmoji);
}

export async function fetchMyReactionEmoji(postId: string, uid: string): Promise<string | undefined> {
  const db = tryGetFirestoreDb();
  if (!db) return undefined;
  const snap = await getDoc(doc(db, "posts", postId, "reactions", uid));
  return snap.data()?.emoji as string | undefined;
}

export async function setPostReaction(
  postId: string,
  uid: string,
  emoji: string,
  countsSeed: Record<string, number>
) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");

  const postRef = doc(db, "posts", postId);
  const reactionRef = doc(db, "posts", postId, "reactions", uid);

  await runTransaction(db, async (tx) => {
    const [reactionSnap, postSnap] = await Promise.all([tx.get(reactionRef), tx.get(postRef)]);
    const prevUserEmoji = reactionSnap.data()?.emoji as string | undefined;
    const storedCounts = normalizeReactionCounts(postSnap.data()?.reactionCounts ?? countsSeed);
    const { counts: nextCounts, nextUserEmoji } = computeReactionCountsUpdate(
      storedCounts,
      prevUserEmoji,
      emoji
    );

    if (nextUserEmoji) {
      tx.set(reactionRef, { emoji: nextUserEmoji, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      tx.delete(reactionRef);
    }
    tx.update(postRef, {
      reactionCounts: nextCounts,
      updatedAt: serverTimestamp(),
    });
  });
}

export type FeedComment = {
  id: string;
  authorId: string;
  author: string;
  authorAvatarColor: string;
  text: string;
  parentId: string | null;
  createdAtMs: number;
  updatedAtMs: number | null;
  edited: boolean;
};

function mapCommentDoc(id: string, data: Record<string, unknown>): FeedComment {
  const created = (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.();
  const updated = (data.updatedAt as { toDate?: () => Date } | undefined)?.toDate?.();
  const createdAtMs = created ? created.getTime() : 0;
  const updatedAtMs = updated ? updated.getTime() : null;
  return {
    id,
    authorId: (data.authorId as string) ?? "",
    author: (data.authorName as string) ?? "Member",
    authorAvatarColor:
      typeof data.authorAvatarColor === "string" && data.authorAvatarColor
        ? data.authorAvatarColor
        : "slate",
    text: (data.text as string) ?? "",
    parentId: (data.parentId as string | null) ?? null,
    createdAtMs,
    updatedAtMs,
    edited: Boolean(data.edited),
  };
}

export function commentTimeLabel(ms: number): string {
  return formatFeedTimeLabel(new Date(ms));
}

export async function addFeedComment(input: {
  postId: string;
  uid: string;
  authorName: string;
  authorAvatarColor: string;
  text: string;
  parentId?: string | null;
}) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const trimmed = input.text.trim();
  if (!trimmed) throw new Error("Comment is empty");
  const batch = writeBatch(db);
  const cref = doc(collection(db, "posts", input.postId, "comments"));
  batch.set(cref, {
    authorId: input.uid,
    authorName: input.authorName,
    authorAvatarColor: input.authorAvatarColor,
    text: trimmed,
    parentId: input.parentId ?? null,
    edited: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, "posts", input.postId), {
    commentCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return cref.id;
}

export async function updateFeedComment(input: {
  postId: string;
  commentId: string;
  uid: string;
  text: string;
}) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const trimmed = input.text.trim();
  if (!trimmed) throw new Error("Comment is empty");
  const ref = doc(db, "posts", input.postId, "comments", input.commentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Comment not found");
  if (snap.data()?.authorId !== input.uid) throw new Error("You can only edit your own comments.");
  await setDoc(
    ref,
    { text: trimmed, edited: true, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** How many post.commentCount units one delete removes (parent thread includes replies). */
export function feedCommentDeleteCount(parentId: string | null, replyCount: number): number {
  if (parentId) return 1;
  return 1 + replyCount;
}

/** Optimistic UI: drop a reply, or a top-level comment and all of its replies. */
export function filterCommentsAfterDelete(rows: FeedComment[], commentId: string): FeedComment[] {
  const target = rows.find((r) => r.id === commentId);
  if (!target) return rows.filter((r) => r.id !== commentId);
  if (target.parentId) return rows.filter((r) => r.id !== commentId);
  return rows.filter((r) => r.id !== commentId && r.parentId !== commentId);
}

const MAX_COMMENTS_PER_DELETE_BATCH = 499;

async function queryCommentReplies(postId: string, parentCommentId: string) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const snap = await getDocs(
    query(
      collection(db, "posts", postId, "comments"),
      where("parentId", "==", parentCommentId)
    )
  );
  return snap.docs;
}

export async function deleteFeedComment(
  postId: string,
  commentId: string,
  uid: string
): Promise<number> {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const ref = doc(db, "posts", postId, "comments", commentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return 0;
  const data = snap.data() ?? {};
  if (data.authorId !== uid) throw new Error("You can only delete your own comments.");

  const parentId = (data.parentId as string | null) ?? null;
  const replyDocs = parentId ? [] : await queryCommentReplies(postId, commentId);
  const deleteCount = feedCommentDeleteCount(parentId, replyDocs.length);
  const toDelete = [ref, ...replyDocs.map((d) => d.ref)];
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  const currentCount =
    typeof postSnap.data()?.commentCount === "number" ? postSnap.data()!.commentCount : 0;
  const nextCount = Math.max(0, currentCount - deleteCount);

  for (let i = 0; i < toDelete.length; i += MAX_COMMENTS_PER_DELETE_BATCH) {
    const chunk = toDelete.slice(i, i + MAX_COMMENTS_PER_DELETE_BATCH);
    const batch = writeBatch(db);
    for (const commentRef of chunk) batch.delete(commentRef);
    if (i + chunk.length >= toDelete.length && nextCount !== currentCount) {
      batch.update(postRef, {
        commentCount: nextCount,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }

  return deleteCount;
}

export type RepairPostCommentsResult = {
  postId: string;
  scanned: number;
  orphansRemoved: number;
  previousCount: number;
  correctedCount: number;
  countAdjusted: boolean;
};

export type RepairFeedCommentsResult = {
  postsScanned: number;
  postsRepaired: number;
  orphansRemoved: number;
  countsAdjusted: number;
  errors: string[];
};

/** Developer/admin repair: remove orphaned replies and sync post.commentCount. */
export async function repairPostCommentIntegrity(postId: string): Promise<RepairPostCommentsResult> {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");

  const commentsRef = collection(db, "posts", postId, "comments");
  const snap = await getDocs(commentsRef);
  const docs = snap.docs;
  const idSet = new Set(docs.map((d) => d.id));
  const orphanDocs = docs.filter((d) => {
    const pid = d.data().parentId as string | null | undefined;
    return Boolean(pid) && !idSet.has(pid);
  });
  const correctedCount = docs.length - orphanDocs.length;

  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);
  const previousCount =
    typeof postSnap.data()?.commentCount === "number" ? postSnap.data()!.commentCount : 0;

  for (let i = 0; i < orphanDocs.length; i += MAX_COMMENTS_PER_DELETE_BATCH) {
    const chunk = orphanDocs.slice(i, i + MAX_COMMENTS_PER_DELETE_BATCH);
    const batch = writeBatch(db);
    for (const orphan of chunk) batch.delete(orphan.ref);
    await batch.commit();
  }

  const countAdjusted = previousCount !== correctedCount;
  if (countAdjusted) {
    await updateDoc(postRef, {
      commentCount: Math.max(0, correctedCount),
      updatedAt: serverTimestamp(),
    });
  }

  return {
    postId,
    scanned: docs.length,
    orphansRemoved: orphanDocs.length,
    previousCount,
    correctedCount,
    countAdjusted,
  };
}

/** Scan every feed post and repair comment threads (admin-only; gated in Firestore rules). */
export async function repairAllFeedCommentIntegrity(): Promise<RepairFeedCommentsResult> {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");

  const postsSnap = await getDocs(collection(db, "posts"));
  const result: RepairFeedCommentsResult = {
    postsScanned: postsSnap.size,
    postsRepaired: 0,
    orphansRemoved: 0,
    countsAdjusted: 0,
    errors: [],
  };

  for (const postDoc of postsSnap.docs) {
    try {
      const row = await repairPostCommentIntegrity(postDoc.id);
      if (row.orphansRemoved > 0 || row.countAdjusted) result.postsRepaired += 1;
      result.orphansRemoved += row.orphansRemoved;
      if (row.countAdjusted) result.countsAdjusted += 1;
    } catch (e) {
      result.errors.push(
        `${postDoc.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return result;
}

export function subscribePostComments(
  postId: string,
  max: number,
  onRows: (rows: FeedComment[]) => void,
  onError?: (e: Error) => void
): () => void {
  const db = tryGetFirestoreDb();
  if (!db) return () => {};
  const q = query(
    collection(db, "posts", postId, "comments"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => mapCommentDoc(d.id, d.data() as Record<string, unknown>));
      rows.sort((a, b) => a.createdAtMs - b.createdAtMs);
      onRows(rows);
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  );
}

export async function setPostSaved(postId: string, uid: string, saved: boolean) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const ref = doc(db, "users", uid, "savedPosts", postId);
  if (saved) {
    await setDoc(ref, { postId, savedAt: serverTimestamp() }, { merge: true });
  } else {
    await deleteDoc(ref);
  }
}

export { DEFAULT_EMOJIS };
