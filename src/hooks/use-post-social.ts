"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { isFirebaseConfigured } from "@/lib/firebase/env";
import {
  addFeedComment,
  type FeedComment,
  type ReactionChip,
  setPostReaction,
  subscribePostComments,
  subscribePostReactions,
} from "@/services/post-engagement";

type UsePostSocialOptions = {
  postId: string;
  uid: string | undefined;
  displayName: string;
  avatarUrl: string | null;
  commentsOpen: boolean;
};

export function usePostSocial({ postId, uid, displayName, avatarUrl, commentsOpen }: UsePostSocialOptions) {
  const [chips, setChips] = useState<ReactionChip[]>([]);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [remoteEnabled] = useState(() => isFirebaseConfigured());

  useEffect(() => {
    if (!remoteEnabled || !postId) return;
    return subscribePostReactions(postId, uid, setChips);
  }, [postId, uid, remoteEnabled]);

  useEffect(() => {
    if (!remoteEnabled || !postId || !commentsOpen) return;
    return subscribePostComments(postId, 24, setComments);
  }, [postId, commentsOpen, remoteEnabled]);

  const toggleReaction = useCallback(
    async (emoji: string) => {
      if (!remoteEnabled || !uid) return;
      await setPostReaction(postId, uid, emoji);
    },
    [postId, uid, remoteEnabled]
  );

  const submitComment = useCallback(
    async (text: string) => {
      if (!remoteEnabled || !uid) return;
      await addFeedComment({
        postId,
        uid,
        authorName: displayName,
        authorAvatarUrl: avatarUrl,
        text,
      });
    },
    [avatarUrl, displayName, postId, uid, remoteEnabled]
  );

  const previewLines = useMemo(
    () => comments.map((c) => ({ author: c.author, text: c.text })),
    [comments]
  );

  return {
    remoteEnabled,
    reactionChips: chips,
    toggleReaction,
    commentRows: comments,
    commentsPreview: previewLines,
    submitComment,
  };
}
