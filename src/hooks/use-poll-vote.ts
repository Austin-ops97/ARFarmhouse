"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { computePollVoteUpdate, isPollExpired } from "@/lib/poll-vote-counts";
import type { UiFeedPost, UiPollData } from "@/models/feed-post";
import { fetchMyPollVoteOptionIds, setPollVote, subscribeMyPollVote } from "@/services/poll-voting";

export function usePollVote(opts: {
  postId: string;
  poll: UiPollData | undefined;
  uid: string | undefined;
  engagementActive: boolean;
  remoteEnabled: boolean;
}) {
  const { postId, poll, uid, engagementActive, remoteEnabled } = opts;
  const [myOptionIds, setMyOptionIds] = useState<string[]>([]);
  const [localPoll, setLocalPoll] = useState<UiPollData | undefined>(poll);
  const [voteBusy, setVoteBusy] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  useEffect(() => {
    setLocalPoll(poll);
  }, [poll]);

  useEffect(() => {
    if (!uid || !engagementActive || !remoteEnabled) {
      setMyOptionIds([]);
      return;
    }
    return subscribeMyPollVote(
      postId,
      uid,
      (ids) => setMyOptionIds(ids),
      () => {}
    );
  }, [engagementActive, postId, remoteEnabled, uid]);

  useEffect(() => {
    if (!uid || !engagementActive || !remoteEnabled) return;
    void fetchMyPollVoteOptionIds(postId, uid).then(setMyOptionIds);
  }, [engagementActive, postId, remoteEnabled, uid]);

  const displayPoll = localPoll ?? poll;

  const vote = useCallback(
    async (optionId: string) => {
      if (!uid || !displayPoll || displayPoll.expired || !remoteEnabled) return;
      setVoteError(null);
      setVoteBusy(true);

      const optimistic = computePollVoteUpdate(displayPoll, myOptionIds, optionId);
      setMyOptionIds(optimistic.nextUserOptionIds);
      setLocalPoll({
        ...displayPoll,
        options: optimistic.options,
        totalVotes: optimistic.options.reduce((n, o) => n + Math.max(0, o.voteCount), 0),
      });

      try {
        await setPollVote(postId, uid, optionId);
      } catch (e) {
        setLocalPoll(poll);
        setMyOptionIds(myOptionIds);
        setVoteError(e instanceof Error ? e.message : "Could not record vote.");
      } finally {
        setVoteBusy(false);
      }
    },
    [displayPoll, myOptionIds, poll, postId, remoteEnabled, uid]
  );

  const canVote = useMemo(
    () =>
      Boolean(
        uid &&
          remoteEnabled &&
          displayPoll &&
          !displayPoll.expired &&
          !isPollExpired(displayPoll.expiresAtMs)
      ),
    [displayPoll, remoteEnabled, uid]
  );

  return {
    poll: displayPoll,
    myOptionIds,
    vote,
    voteBusy,
    voteError,
    canVote,
  };
}

export function feedPostHasPoll(post: UiFeedPost): post is UiFeedPost & { poll: UiPollData } {
  return post.kind === "poll" && !!post.poll;
}
