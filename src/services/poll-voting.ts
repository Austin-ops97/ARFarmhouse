import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";

import { computePollVoteUpdate, isPollExpired } from "@/lib/poll-vote-counts";
import { tryGetFirestoreDb } from "@/lib/firebase";
import type { FirestorePollData, FirestorePost } from "@/models/feed-post";

export async function fetchMyPollVoteOptionIds(postId: string, uid: string): Promise<string[]> {
  const db = tryGetFirestoreDb();
  if (!db) return [];
  const snap = await getDoc(doc(db, "posts", postId, "pollVotes", uid));
  const raw = snap.data()?.optionIds;
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : [];
}

export function subscribeMyPollVote(
  postId: string,
  uid: string,
  onOptionIds: (optionIds: string[]) => void,
  onError?: (e: Error) => void
): () => void {
  const db = tryGetFirestoreDb();
  if (!db) {
    onOptionIds([]);
    return () => {};
  }
  return onSnapshot(
    doc(db, "posts", postId, "pollVotes", uid),
    (snap) => {
      const raw = snap.data()?.optionIds;
      onOptionIds(Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : []);
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  );
}

function pollExpiresAtMs(poll: FirestorePollData | undefined): number | null {
  const ts = poll?.expiresAt as Timestamp | null | undefined;
  if (!ts?.toDate) return null;
  return ts.toDate().getTime();
}

export async function setPollVote(postId: string, uid: string, tappedOptionId: string) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");

  const postRef = doc(db, "posts", postId);
  const voteRef = doc(db, "posts", postId, "pollVotes", uid);

  await runTransaction(db, async (tx) => {
    const [postSnap, voteSnap] = await Promise.all([tx.get(postRef), tx.get(voteRef)]);
    const post = postSnap.data() as Partial<FirestorePost> | undefined;
    if (post?.contentType !== "poll" || !post.poll) {
      throw new Error("This post is not a poll.");
    }

    const expiresMs = pollExpiresAtMs(post.poll);
    if (isPollExpired(expiresMs)) {
      throw new Error("This poll has ended.");
    }

    const prevOptionIds = Array.isArray(voteSnap.data()?.optionIds)
      ? (voteSnap.data()!.optionIds as string[])
      : [];

    const { options, nextUserOptionIds } = computePollVoteUpdate(post.poll, prevOptionIds, tappedOptionId);

    const nextPoll: FirestorePollData = {
      ...post.poll,
      options,
    };

    if (nextUserOptionIds.length > 0) {
      tx.set(voteRef, { optionIds: nextUserOptionIds, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      tx.delete(voteRef);
    }

    tx.update(postRef, {
      poll: nextPoll,
      updatedAt: serverTimestamp(),
    });
  });
}
