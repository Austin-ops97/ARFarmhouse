import type { PollOption } from "@/models/feed-post";

export type PollVoteCountsInput = {
  options: PollOption[];
  allowMultiple: boolean;
};

/** Returns updated option vote counts and the user's stored selection after a tap. */
export function computePollVoteUpdate(
  poll: PollVoteCountsInput,
  prevOptionIds: string[] | undefined,
  tappedOptionId: string
): { options: PollOption[]; nextUserOptionIds: string[] } {
  const validIds = new Set(poll.options.map((o) => o.id));
  if (!validIds.has(tappedOptionId)) {
    return {
      options: poll.options.map((o) => ({ ...o })),
      nextUserOptionIds: normalizeOptionIds(prevOptionIds, validIds),
    };
  }

  const prev = normalizeOptionIds(prevOptionIds, validIds);
  let next: string[];

  if (poll.allowMultiple) {
    next = prev.includes(tappedOptionId)
      ? prev.filter((id) => id !== tappedOptionId)
      : [...prev, tappedOptionId];
  } else {
    next = prev.includes(tappedOptionId) ? [] : [tappedOptionId];
  }

  const delta = new Map<string, number>();
  for (const id of prev) {
    if (!next.includes(id)) delta.set(id, (delta.get(id) ?? 0) - 1);
  }
  for (const id of next) {
    if (!prev.includes(id)) delta.set(id, (delta.get(id) ?? 0) + 1);
  }

  const options = poll.options.map((o) => {
    const change = delta.get(o.id) ?? 0;
    if (change === 0) return { ...o };
    return { ...o, voteCount: Math.max(0, o.voteCount + change) };
  });

  return { options, nextUserOptionIds: next };
}

function normalizeOptionIds(ids: string[] | undefined, validIds: Set<string>): string[] {
  if (!ids?.length) return [];
  return ids.filter((id) => validIds.has(id));
}

export function pollTotalVotes(options: PollOption[]): number {
  return options.reduce((sum, o) => sum + Math.max(0, o.voteCount), 0);
}

export function pollOptionPercent(voteCount: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.max(0, voteCount) / total) * 100);
}

export function isPollExpired(expiresAtMs: number | null | undefined, nowMs = Date.now()): boolean {
  if (expiresAtMs == null) return false;
  return nowMs >= expiresAtMs;
}
