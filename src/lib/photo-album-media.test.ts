import { describe, expect, it } from "vitest";

import {
  buildMemoryHighlights,
  extractAlbumMediaFromPosts,
  mergeAlbumCatalog,
  shelfItems,
  type AlbumMediaItem,
} from "@/lib/photo-album-media";
import type { UiFeedPost } from "@/models/feed-post";

const basePost = (overrides: Partial<UiFeedPost>): UiFeedPost =>
  ({
    id: "p1",
    authorId: "u1",
    category: "update",
    layout: "standard",
    author: { name: "Alex", handle: "@alex", avatar: "" },
    timeLabel: "Today",
    body: "Weekend at the lake",
    kind: "image",
    cover: "https://example.com/a.jpg",
    reactions: [],
    reactionCounts: {},
    commentsPreview: [],
    commentCount: 0,
    ...overrides,
  }) as UiFeedPost;

describe("photo-album-media", () => {
  it("extracts feed images without duplicates", () => {
    const items = extractAlbumMediaFromPosts([basePost({}), basePost({ id: "p2" })]);
    expect(items).toHaveLength(1);
    expect(items[0]?.source).toBe("feed");
  });

  it("merges cloud uploads with feed by src", () => {
    const cloud: AlbumMediaItem[] = [
      {
        id: "c1",
        src: "https://cdn/album.jpg",
        caption: "Dock sunset",
        source: "upload",
        albumKey: "weekend",
        addedAt: 100,
      },
    ];
    const feed = extractAlbumMediaFromPosts([basePost({ cover: "https://cdn/album.jpg" })]);
    const merged = mergeAlbumCatalog(cloud, feed);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.source).toBe("upload");
  });

  it("places uploads on weekend shelf via albumKey", () => {
    const items: AlbumMediaItem[] = [
      {
        id: "1",
        src: "https://x/1.jpg",
        caption: "Quiet morning",
        source: "upload",
        albumKey: "weekend",
      },
    ];
    expect(shelfItems("this_weekend", items)).toHaveLength(1);
  });

  it("builds trip memory highlights", () => {
    const items: AlbumMediaItem[] = [
      {
        id: "1",
        src: "https://x/1.jpg",
        caption: "One",
        linkedEvent: "Memorial Day",
        source: "feed",
      },
      {
        id: "2",
        src: "https://x/2.jpg",
        caption: "Two",
        linkedEvent: "Memorial Day",
        source: "feed",
      },
    ];
    const highlights = buildMemoryHighlights(items);
    expect(highlights.some((h) => h.title.includes("Memorial Day"))).toBe(true);
  });
});
