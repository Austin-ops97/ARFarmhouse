import { describe, expect, it } from "vitest";

import { previewReactionAfterToggle } from "@/services/post-engagement";

describe("previewReactionAfterToggle", () => {
  const base = [
    { emoji: "❤️", count: 2, active: true },
    { emoji: "👏", count: 1, active: false },
    { emoji: "🔥", count: 0, active: false },
  ];

  it("switches active emoji and adjusts counts", () => {
    const next = previewReactionAfterToggle(base, "👏");
    expect(next.find((c) => c.emoji === "❤️")?.count).toBe(1);
    expect(next.find((c) => c.emoji === "👏")?.active).toBe(true);
    expect(next.find((c) => c.emoji === "👏")?.count).toBe(2);
  });

  it("removes reaction when tapping the active emoji", () => {
    const next = previewReactionAfterToggle(base, "❤️");
    expect(next.find((c) => c.emoji === "❤️")?.active).toBe(false);
    expect(next.find((c) => c.emoji === "❤️")?.count).toBe(1);
  });
});
