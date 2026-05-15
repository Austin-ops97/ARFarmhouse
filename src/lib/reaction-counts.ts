import type { ReactionChip } from "@/services/post-engagement";

const DEFAULT_EMOJIS = ["❤️", "👏", "🔥"] as const;

export function normalizeReactionCounts(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [emoji, n] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof n === "number" && n > 0) out[emoji] = n;
  }
  return out;
}

/** Apply a user tap to denormalized counts (mirrors Firestore transaction logic). */
export function computeReactionCountsUpdate(
  counts: Record<string, number>,
  prevUserEmoji: string | undefined,
  tapEmoji: string
): { counts: Record<string, number>; nextUserEmoji: string | undefined } {
  const next = { ...counts };
  if (prevUserEmoji === tapEmoji) {
    next[tapEmoji] = Math.max(0, (next[tapEmoji] ?? 0) - 1);
    if ((next[tapEmoji] ?? 0) <= 0) delete next[tapEmoji];
    return { counts: next, nextUserEmoji: undefined };
  }
  if (prevUserEmoji) {
    next[prevUserEmoji] = Math.max(0, (next[prevUserEmoji] ?? 0) - 1);
    if ((next[prevUserEmoji] ?? 0) <= 0) delete next[prevUserEmoji];
  }
  next[tapEmoji] = (next[tapEmoji] ?? 0) + 1;
  return { counts: next, nextUserEmoji: tapEmoji };
}

export function buildChipsFromCounts(
  counts: Record<string, number>,
  mineEmoji: string | undefined
): ReactionChip[] {
  const emojiSet = new Set<string>([...DEFAULT_EMOJIS, ...Object.keys(counts)]);
  const chips: ReactionChip[] = Array.from(emojiSet).map((emoji) => ({
    emoji,
    count: Math.max(0, counts[emoji] ?? 0),
    active: mineEmoji === emoji,
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
  return chips;
}

export function reactionTotal(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, n) => a + n, 0);
}
