import { describe, expect, it } from "vitest";

import { computePollVoteUpdate, pollOptionPercent, pollTotalVotes } from "@/lib/poll-vote-counts";

const basePoll = {
  allowMultiple: false,
  options: [
    { id: "a", text: "A", voteCount: 2 },
    { id: "b", text: "B", voteCount: 1 },
    { id: "c", text: "C", voteCount: 0 },
  ],
};

describe("computePollVoteUpdate", () => {
  it("selects a single option and decrements the previous one", () => {
    const first = computePollVoteUpdate(basePoll, undefined, "a");
    expect(first.nextUserOptionIds).toEqual(["a"]);
    expect(first.options.find((o) => o.id === "a")?.voteCount).toBe(3);

    const switched = computePollVoteUpdate(
      { ...basePoll, options: first.options },
      first.nextUserOptionIds,
      "b"
    );
    expect(switched.nextUserOptionIds).toEqual(["b"]);
    expect(switched.options.find((o) => o.id === "a")?.voteCount).toBe(2);
    expect(switched.options.find((o) => o.id === "b")?.voteCount).toBe(2);
  });

  it("clears a single-choice vote when tapping the active option", () => {
    const next = computePollVoteUpdate(basePoll, ["b"], "b");
    expect(next.nextUserOptionIds).toEqual([]);
    expect(next.options.find((o) => o.id === "b")?.voteCount).toBe(0);
  });

  it("toggles multiple selections when allowMultiple is true", () => {
    const poll = { ...basePoll, allowMultiple: true };
    const first = computePollVoteUpdate(poll, undefined, "a");
    const second = computePollVoteUpdate(
      { ...poll, options: first.options },
      first.nextUserOptionIds,
      "b"
    );
    expect(second.nextUserOptionIds).toEqual(["a", "b"]);

    const untoggle = computePollVoteUpdate(
      { ...poll, options: second.options },
      second.nextUserOptionIds,
      "a"
    );
    expect(untoggle.nextUserOptionIds).toEqual(["b"]);
  });
});

describe("pollTotalVotes", () => {
  it("sums option counts", () => {
    expect(pollTotalVotes(basePoll.options)).toBe(3);
  });
});

describe("pollOptionPercent", () => {
  it("returns rounded percentage", () => {
    expect(pollOptionPercent(1, 3)).toBe(33);
    expect(pollOptionPercent(0, 0)).toBe(0);
  });
});
