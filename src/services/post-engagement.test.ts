import { describe, expect, it } from "vitest";

import {
  feedCommentDeleteCount,
  filterCommentsAfterDelete,
  previewReactionAfterToggle,
  type FeedComment,
} from "@/services/post-engagement";

const sampleRows: FeedComment[] = [
  {
    id: "a",
    authorId: "u1",
    author: "A",
    authorAvatarColor: "slate",
    text: "parent",
    parentId: null,
    createdAtMs: 1,
    updatedAtMs: null,
    edited: false,
  },
  {
    id: "b",
    authorId: "u2",
    author: "B",
    authorAvatarColor: "slate",
    text: "reply",
    parentId: "a",
    createdAtMs: 2,
    updatedAtMs: null,
    edited: false,
  },
];

describe("feedCommentDeleteCount", () => {
  it("decrements by one for a reply", () => {
    expect(feedCommentDeleteCount("parent", 0)).toBe(1);
  });

  it("decrements by parent plus replies for a top-level comment", () => {
    expect(feedCommentDeleteCount(null, 3)).toBe(4);
  });
});

describe("filterCommentsAfterDelete", () => {
  it("removes only the reply when deleting a reply", () => {
    expect(filterCommentsAfterDelete(sampleRows, "b").map((r) => r.id)).toEqual(["a"]);
  });

  it("removes the parent and all replies when deleting a top-level comment", () => {
    expect(filterCommentsAfterDelete(sampleRows, "a").map((r) => r.id)).toEqual([]);
  });
});

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
