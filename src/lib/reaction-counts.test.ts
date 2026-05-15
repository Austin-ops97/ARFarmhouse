import { describe, expect, it } from "vitest";

import { buildChipsFromCounts, computeReactionCountsUpdate, reactionTotal } from "@/lib/reaction-counts";

describe("computeReactionCountsUpdate", () => {
  it("adds a new reaction", () => {
    const { counts, nextUserEmoji } = computeReactionCountsUpdate({}, undefined, "❤️");
    expect(counts["❤️"]).toBe(1);
    expect(nextUserEmoji).toBe("❤️");
  });

  it("switches emoji", () => {
    const { counts, nextUserEmoji } = computeReactionCountsUpdate({ "❤️": 1 }, "❤️", "👏");
    expect(counts["❤️"] ?? 0).toBe(0);
    expect(counts["👏"]).toBe(1);
    expect(nextUserEmoji).toBe("👏");
  });

  it("removes when tapping same emoji", () => {
    const { counts, nextUserEmoji } = computeReactionCountsUpdate({ "❤️": 1 }, "❤️", "❤️");
    expect(counts["❤️"]).toBeUndefined();
    expect(nextUserEmoji).toBeUndefined();
  });
});

describe("buildChipsFromCounts", () => {
  it("marks active emoji", () => {
    const chips = buildChipsFromCounts({ "❤️": 2 }, "❤️");
    expect(chips.find((c) => c.emoji === "❤️")?.active).toBe(true);
  });
});

describe("reactionTotal", () => {
  it("sums counts", () => {
    expect(reactionTotal({ "❤️": 2, "👏": 1 })).toBe(3);
  });
});
