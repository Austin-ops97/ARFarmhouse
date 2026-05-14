import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { tryGetFirestoreDb } from "@/lib/firebase/client";

const DEFAULT_EMOJIS = ["❤️", "👏", "🔥"] as const;

export type ReactionChip = { emoji: string; count: number; active: boolean };

export async function setPostReaction(postId: string, uid: string, emoji: string) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const ref = doc(db, "posts", postId, "reactions", uid);
  const cur = await getDoc(ref);
  const prev = cur.data()?.emoji as string | undefined;
  if (prev === emoji) {
    await deleteDoc(ref);
    return;
  }
  await setDoc(ref, { emoji, updatedAt: serverTimestamp() }, { merge: true });
}

export type FeedComment = {
  id: string;
  author: string;
  text: string;
  createdAtMs: number;
};

export async function addFeedComment(input: {
  postId: string;
  uid: string;
  authorName: string;
  authorAvatarUrl: string | null;
  text: string;
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
    authorAvatarUrl: input.authorAvatarUrl,
    text: trimmed,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, "posts", input.postId), {
    commentCount: increment(1),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

export function subscribePostReactions(
  postId: string,
  uid: string | undefined,
  onChips: (chips: ReactionChip[]) => void
): () => void {
  const db = tryGetFirestoreDb();
  if (!db) return () => {};
  const ref = collection(db, "posts", postId, "reactions");
  return onSnapshot(ref, (snap) => {
    const counts: Record<string, number> = {};
    let mine: string | undefined;
    snap.forEach((d) => {
      const emoji = d.data().emoji as string | undefined;
      if (!emoji) return;
      counts[emoji] = (counts[emoji] ?? 0) + 1;
      if (uid && d.id === uid) mine = emoji;
    });
    const emojiSet = new Set<string>([...DEFAULT_EMOJIS, ...Object.keys(counts)]);
    const chips: ReactionChip[] = Array.from(emojiSet).map((emoji) => ({
      emoji,
      count: counts[emoji] ?? 0,
      active: mine === emoji,
    }));
    chips.sort((a, b) => {
      const ai = DEFAULT_EMOJIS.indexOf(a.emoji as (typeof DEFAULT_EMOJIS)[number]);
      const bi = DEFAULT_EMOJIS.indexOf(b.emoji as (typeof DEFAULT_EMOJIS)[number]);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return b.count - a.count;
    });
    onChips(chips);
  });
}

export function subscribePostComments(
  postId: string,
  max: number,
  onRows: (rows: FeedComment[]) => void
): () => void {
  const db = tryGetFirestoreDb();
  if (!db) return () => {};
  const q = query(
    collection(db, "posts", postId, "comments"),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    const rows: FeedComment[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const created = data.createdAt?.toDate?.() as Date | undefined;
      rows.push({
        id: d.id,
        author: (data.authorName as string) ?? "Member",
        text: (data.text as string) ?? "",
        createdAtMs: created ? created.getTime() : 0,
      });
    });
    rows.sort((a, b) => a.createdAtMs - b.createdAtMs);
    onRows(rows);
  });
}
