"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { notifyFeedComment, notifyFeedReaction } from "@/lib/notification-fanout";
import { buildChipsFromCounts, computeReactionCountsUpdate } from "@/lib/reaction-counts";
import {
  addFeedComment,
  deleteFeedComment,
  fetchMyReactionEmoji,
  type FeedComment,
  previewReactionAfterToggle,
  type ReactionChip,
  setPostReaction,
  setPostSaved,
  subscribePostComments,
  updateFeedComment,
} from "@/services/post-engagement";

function chipsEqual(a: ReactionChip[], b: ReactionChip[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (!y || x.emoji !== y.emoji || x.count !== y.count || x.active !== y.active) return false;
  }
  return true;
}

type UsePostSocialOptions = {
  postId: string;
  uid: string | undefined;
  displayName: string;
  avatarUrl: string | null;
  reactionCounts: Record<string, number>;
  commentsOpen: boolean;
  engagementActive: boolean;
  remoteEnabled: boolean;
  saved: boolean;
  onSavedChange: (saved: boolean) => Promise<void>;
};

const IDLE_REACTION_CHIPS: ReactionChip[] = [
  { emoji: "❤️", count: 0, active: false },
  { emoji: "👏", count: 0, active: false },
  { emoji: "🔥", count: 0, active: false },
];

export function usePostSocial({
  postId,
  uid,
  displayName,
  avatarUrl,
  reactionCounts,
  commentsOpen,
  engagementActive,
  remoteEnabled,
  saved,
  onSavedChange,
}: UsePostSocialOptions) {
  const countsFromFeed = useMemo(() => reactionCounts, [reactionCounts]);
  const [mineEmoji, setMineEmoji] = useState<string | undefined>(undefined);
  const [mineLoaded, setMineLoaded] = useState(false);
  const [optimisticChips, setOptimisticChips] = useState<ReactionChip[] | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [pendingComments, setPendingComments] = useState<FeedComment[]>([]);
  const [savedPending, setSavedPending] = useState<boolean | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);

  const serverChips = useMemo(
    () => buildChipsFromCounts(countsFromFeed, mineEmoji),
    [countsFromFeed, mineEmoji]
  );
  const serverChipsRef = useRef(serverChips);
  useEffect(() => {
    serverChipsRef.current = serverChips;
  }, [serverChips]);

  useEffect(() => {
    if (!remoteEnabled) {
      startTransition(() => {
        setMineEmoji(undefined);
        setMineLoaded(false);
        setOptimisticChips(null);
      });
    }
  }, [remoteEnabled]);

  useEffect(() => {
    if (!remoteEnabled || !uid || !engagementActive || mineLoaded) return;
    let cancelled = false;
    void fetchMyReactionEmoji(postId, uid).then((emoji) => {
      if (cancelled) return;
      setMineEmoji(emoji);
      setMineLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [engagementActive, mineLoaded, postId, remoteEnabled, uid]);

  useEffect(() => {
    if (!remoteEnabled || !postId || !commentsOpen) return;
    return subscribePostComments(postId, 48, setComments, (e) => setSocialError(e.message));
  }, [postId, commentsOpen, remoteEnabled]);

  useEffect(() => {
    if (!optimisticChips) return;
    if (!chipsEqual(optimisticChips, serverChips)) return;
    startTransition(() => setOptimisticChips(null));
  }, [optimisticChips, serverChips]);

  useEffect(() => {
    if (savedPending === null) return;
    if (saved !== savedPending) return;
    startTransition(() => setSavedPending(null));
  }, [saved, savedPending]);

  const reactionChips = optimisticChips ?? serverChips;

  const toggleReaction = useCallback(
    async (emoji: string) => {
      if (!remoteEnabled || !uid) return;
      setOptimisticChips((prev) => previewReactionAfterToggle(prev ?? serverChipsRef.current, emoji));
      const prevMine = mineEmoji;
      const { nextUserEmoji } = computeReactionCountsUpdate(countsFromFeed, prevMine, emoji);
      setMineEmoji(nextUserEmoji);
      try {
        await setPostReaction(postId, uid, emoji, countsFromFeed);
        if (nextUserEmoji) {
          void notifyFeedReaction({
            postId,
            actorId: uid,
            actorName: displayName,
            actorAvatarUrl: avatarUrl,
            emoji: nextUserEmoji,
          });
        }
        setSocialError(null);
      } catch (e) {
        setOptimisticChips(null);
        setMineEmoji(prevMine);
        setSocialError(e instanceof Error ? e.message : "Could not update reaction.");
      }
    },
    [avatarUrl, countsFromFeed, displayName, mineEmoji, postId, remoteEnabled, uid]
  );

  const toggleSaved = useCallback(async () => {
    if (!remoteEnabled || !uid) return;
    const next = !(savedPending ?? saved);
    setSavedPending(next);
    try {
      await onSavedChange(next);
      setSocialError(null);
    } catch (e) {
      setSavedPending(null);
      setSocialError(e instanceof Error ? e.message : "Could not save post.");
    }
  }, [onSavedChange, remoteEnabled, saved, savedPending, uid]);

  const submitComment = useCallback(
    async (text: string, parentId?: string | null) => {
      if (!remoteEnabled || !uid) return;
      const tempId = `pending_${Date.now()}`;
      const optimistic: FeedComment = {
        id: tempId,
        authorId: uid,
        author: displayName,
        authorAvatarUrl: avatarUrl,
        text: text.trim(),
        parentId: parentId ?? null,
        createdAtMs: Date.now(),
        updatedAtMs: null,
        edited: false,
      };
      setPendingComments((rows) => [...rows, optimistic]);
      try {
        const commentId = await addFeedComment({
          postId,
          uid,
          authorName: displayName,
          authorAvatarUrl: avatarUrl,
          text,
          parentId,
        });
        void notifyFeedComment({
          postId,
          commentId,
          actorId: uid,
          actorName: displayName,
          actorAvatarUrl: avatarUrl,
          parentId,
        });
        setPendingComments((rows) => rows.filter((r) => r.id !== tempId));
        setSocialError(null);
      } catch (e) {
        setPendingComments((rows) => rows.filter((r) => r.id !== tempId));
        setSocialError(e instanceof Error ? e.message : "Could not post comment.");
        throw e;
      }
    },
    [avatarUrl, displayName, postId, uid, remoteEnabled]
  );

  const editComment = useCallback(
    async (commentId: string, text: string) => {
      if (!remoteEnabled || !uid) return;
      setComments((rows) =>
        rows.map((r) =>
          r.id === commentId ? { ...r, text: text.trim(), edited: true, updatedAtMs: Date.now() } : r
        )
      );
      try {
        await updateFeedComment({ postId, commentId, uid, text });
        setSocialError(null);
      } catch (e) {
        setSocialError(e instanceof Error ? e.message : "Could not update comment.");
        throw e;
      }
    },
    [postId, remoteEnabled, uid]
  );

  const removeComment = useCallback(
    async (commentId: string) => {
      if (!remoteEnabled || !uid) return;
      setComments((rows) => rows.filter((r) => r.id !== commentId));
      try {
        await deleteFeedComment(postId, commentId, uid);
        setSocialError(null);
      } catch (e) {
        setSocialError(e instanceof Error ? e.message : "Could not delete comment.");
        throw e;
      }
    },
    [postId, remoteEnabled, uid]
  );

  const commentRows = useMemo(() => {
    const confirmedIds = new Set(comments.map((c) => c.id));
    const pending = pendingComments.filter((p) => !confirmedIds.has(p.id));
    return [...comments, ...pending].sort((a, b) => a.createdAtMs - b.createdAtMs);
  }, [comments, pendingComments]);

  const previewLines = useMemo(
    () => commentRows.slice(-2).map((c) => ({ author: c.author, text: c.text })),
    [commentRows]
  );

  const savedDisplay = savedPending ?? saved;

  return {
    remoteEnabled,
    reactionChips: remoteEnabled ? reactionChips : IDLE_REACTION_CHIPS,
    toggleReaction,
    commentRows,
    commentsPreview: previewLines,
    submitComment,
    editComment,
    removeComment,
    saved: savedDisplay,
    toggleSaved,
    socialError,
  };
}
