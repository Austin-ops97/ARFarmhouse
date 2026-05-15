"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  addFeedComment,
  type FeedComment,
  previewReactionAfterToggle,
  type ReactionChip,
  setPostReaction,
  setPostSaved,
  subscribePostComments,
  subscribePostReactions,
  subscribePostSaved,
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
  commentsOpen: boolean;
  /** From auth context — avoids SSR/client drift from reading `process.env` in hooks. */
  remoteEnabled: boolean;
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
  commentsOpen,
  remoteEnabled,
}: UsePostSocialOptions) {
  const [serverChips, setServerChips] = useState<ReactionChip[]>(IDLE_REACTION_CHIPS);
  const serverChipsRef = useRef(serverChips);
  const [optimisticChips, setOptimisticChips] = useState<ReactionChip[] | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [savedRemote, setSavedRemote] = useState(false);
  const [savedPending, setSavedPending] = useState<boolean | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);

  useEffect(() => {
    serverChipsRef.current = serverChips;
  }, [serverChips]);

  useEffect(() => {
    if (remoteEnabled) return;
    startTransition(() => {
      setServerChips(IDLE_REACTION_CHIPS);
      setSavedRemote(false);
      setOptimisticChips(null);
    });
  }, [remoteEnabled]);

  useEffect(() => {
    if (!remoteEnabled || !postId) return;
    return subscribePostReactions(postId, uid, setServerChips, (e) => setSocialError(e.message));
  }, [postId, uid, remoteEnabled]);

  useEffect(() => {
    if (!remoteEnabled || !postId) return;
    return subscribePostSaved(postId, uid, setSavedRemote, (e) => setSocialError(e.message));
  }, [postId, uid, remoteEnabled]);

  useEffect(() => {
    if (!remoteEnabled || !postId || !commentsOpen) return;
    return subscribePostComments(postId, 24, setComments, (e) => setSocialError(e.message));
  }, [postId, commentsOpen, remoteEnabled]);

  useEffect(() => {
    if (!optimisticChips) return;
    if (!chipsEqual(optimisticChips, serverChips)) return;
    startTransition(() => setOptimisticChips(null));
  }, [optimisticChips, serverChips]);

  useEffect(() => {
    if (savedPending === null) return;
    if (savedRemote !== savedPending) return;
    startTransition(() => setSavedPending(null));
  }, [savedRemote, savedPending]);

  const reactionChips = optimisticChips ?? serverChips;

  const toggleReaction = useCallback(
    async (emoji: string) => {
      if (!remoteEnabled || !uid) return;
      setOptimisticChips((prev) => previewReactionAfterToggle(prev ?? serverChipsRef.current, emoji));
      try {
        await setPostReaction(postId, uid, emoji);
        setSocialError(null);
      } catch (e) {
        setOptimisticChips(null);
        setSocialError(e instanceof Error ? e.message : "Could not update reaction.");
      }
    },
    [postId, remoteEnabled, uid]
  );

  const toggleSaved = useCallback(async () => {
    if (!remoteEnabled || !uid) return;
    const next = !(savedPending ?? savedRemote);
    setSavedPending(next);
    try {
      await setPostSaved(postId, uid, next);
      setSocialError(null);
    } catch (e) {
      setSavedPending(null);
      setSocialError(e instanceof Error ? e.message : "Could not save post.");
    }
  }, [postId, remoteEnabled, savedPending, savedRemote, uid]);

  const submitComment = useCallback(
    async (text: string) => {
      if (!remoteEnabled || !uid) return;
      try {
        await addFeedComment({
          postId,
          uid,
          authorName: displayName,
          authorAvatarUrl: avatarUrl,
          text,
        });
        setSocialError(null);
      } catch (e) {
        setSocialError(e instanceof Error ? e.message : "Could not post comment.");
        throw e;
      }
    },
    [avatarUrl, displayName, postId, uid, remoteEnabled]
  );

  const previewLines = useMemo(
    () => comments.map((c) => ({ author: c.author, text: c.text })),
    [comments]
  );

  const saved = savedPending ?? savedRemote;

  return {
    remoteEnabled,
    reactionChips,
    toggleReaction,
    commentRows: comments,
    commentsPreview: previewLines,
    submitComment,
    saved,
    toggleSaved,
    socialError,
  };
}
