import type { UiFeedPost } from "@/models/feed-post";

export type AlbumSource = "feed" | "upload";

export type AlbumMediaItem = {
  id: string;
  src: string;
  postId?: string;
  postTitle?: string;
  authorName?: string;
  caption: string;
  linkedEvent?: string;
  feedCategory?: UiFeedPost["category"];
  source: AlbumSource;
  timeLabel?: string;
  /** User-chosen bucket when uploaded */
  albumKey?: string;
  addedAt?: number;
  storagePath?: string;
  uploadedBy?: string;
};

export function extractAlbumMediaFromPosts(posts: readonly UiFeedPost[]): AlbumMediaItem[] {
  const items: AlbumMediaItem[] = [];
  const seen = new Set<string>();

  for (const post of posts) {
    const caption = post.title ? `${post.title} — ${post.body}` : post.body;
    const push = (src: string, idx: number) => {
      if (!src || seen.has(src)) return;
      seen.add(src);
      items.push({
        id: `${post.id}-m-${idx}`,
        src,
        postId: post.id,
        postTitle: post.title,
        authorName: post.author.name,
        caption: caption.slice(0, 220),
        linkedEvent: post.linkedEvent,
        feedCategory: post.category,
        source: "feed",
        timeLabel: post.timeLabel,
      });
    };

    if (post.kind === "image" || post.kind === "event_recap") {
      if (post.cover) push(post.cover, 0);
    } else if (post.kind === "album" && post.album?.length) {
      post.album.forEach((src, i) => push(src, i));
    } else if (post.kind === "video" && post.video?.poster) {
      push(post.video.poster, 0);
    }
  }

  return items;
}

export type AlbumShelfId =
  | "recent"
  | "this_weekend"
  | "fishing"
  | "gatherings"
  | "seasonal"
  | "property"
  | "trails"
  | "sunsets"
  | "wildlife";

export type AlbumShelf = {
  id: AlbumShelfId;
  title: string;
  subtitle: string;
};

export const ALBUM_SHELVES: AlbumShelf[] = [
  { id: "recent", title: "Recent memories", subtitle: "Fresh from the feed and your uploads" },
  { id: "this_weekend", title: "This weekend", subtitle: "Anchored to what’s on the calendar" },
  { id: "fishing", title: "Fishing trips", subtitle: "Dawn launches and quiet water" },
  { id: "gatherings", title: "Family gatherings", subtitle: "Tables long and laughter loud" },
  { id: "seasonal", title: "Seasonal highlights", subtitle: "Rhythm of the year on the land" },
  { id: "property", title: "Property progress", subtitle: "Work that becomes legacy" },
  { id: "trails", title: "Trail adventures", subtitle: "Miles, markers, and morning air" },
  { id: "sunsets", title: "Sunset photos", subtitle: "Rose light on the ridge" },
  { id: "wildlife", title: "Wildlife", subtitle: "Quiet visitors at the edges" },
];

const norm = (s: string) => s.toLowerCase();

const SHELF_ALBUM_KEYS: Partial<Record<AlbumShelfId, readonly string[]>> = {
  this_weekend: ["weekend"],
  gatherings: ["gathering"],
  property: ["projects"],
  trails: ["trails"],
  wildlife: ["wildlife"],
};

function matchesAlbumKey(shelfId: AlbumShelfId, m: AlbumMediaItem): boolean {
  const keys = SHELF_ALBUM_KEYS[shelfId];
  if (!keys?.length || !m.albumKey) return false;
  return keys.includes(m.albumKey);
}

function matchesThisWeekend(m: AlbumMediaItem): boolean {
  if (matchesAlbumKey("this_weekend", m)) return true;
  const t = `${m.linkedEvent ?? ""} ${m.postTitle ?? ""} ${m.caption}`;
  const n = norm(t);
  return (
    n.includes("memorial") ||
    n.includes("may 23") ||
    n.includes("weekend is on") ||
    n.includes("family weekend")
  );
}

function matchesFishing(m: AlbumMediaItem): boolean {
  const t = norm(`${m.linkedEvent ?? ""} ${m.postTitle ?? ""} ${m.caption}`);
  return t.includes("fish") || t.includes("willow creek") || (t.includes("lake") && (t.includes("trip") || t.includes("bite")));
}

function matchesGatherings(m: AlbumMediaItem): boolean {
  if (matchesAlbumKey("gatherings", m)) return true;
  const t = norm(`${m.linkedEvent ?? ""} ${m.postTitle ?? ""} ${m.caption}`);
  return (
    m.feedCategory === "event" ||
    t.includes("bbq") ||
    t.includes("birthday") ||
    t.includes("gathering") ||
    t.includes("croquet")
  );
}

function matchesSeasonal(m: AlbumMediaItem): boolean {
  const t = norm(`${m.postTitle ?? ""} ${m.caption}`);
  return t.includes("summer") || t.includes("holiday") || t.includes("memorial");
}

function matchesProperty(m: AlbumMediaItem): boolean {
  if (matchesAlbumKey("property", m)) return true;
  const t = norm(`${m.postTitle ?? ""} ${m.caption}`);
  return m.feedCategory === "project" || t.includes("dock") || t.includes("construction") || t.includes("stain");
}

function matchesTrails(m: AlbumMediaItem): boolean {
  if (matchesAlbumKey("trails", m)) return true;
  const t = norm(`${m.postTitle ?? ""} ${m.caption} ${m.linkedEvent ?? ""}`);
  return t.includes("trail") || t.includes("mile") || t.includes("east trail");
}

function matchesSunsets(m: AlbumMediaItem): boolean {
  const t = norm(`${m.postTitle ?? ""} ${m.caption}`);
  return t.includes("sunset") || t.includes("golden hour") || t.includes("rose");
}

function matchesWildlife(m: AlbumMediaItem): boolean {
  if (matchesAlbumKey("wildlife", m)) return true;
  return m.feedCategory === "wildlife" || norm(m.caption).includes("elk") || norm(m.postTitle ?? "").includes("elk");
}

export function shelfItems(shelfId: AlbumShelfId, items: readonly AlbumMediaItem[]): AlbumMediaItem[] {
  const all = [...items].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
  switch (shelfId) {
    case "recent":
      return all.slice(0, 24);
    case "this_weekend":
      return all.filter(matchesThisWeekend);
    case "fishing":
      return all.filter(matchesFishing);
    case "gatherings":
      return all.filter(matchesGatherings);
    case "seasonal":
      return all.filter(matchesSeasonal);
    case "property":
      return all.filter(matchesProperty);
    case "trails":
      return all.filter(matchesTrails);
    case "sunsets":
      return all.filter(matchesSunsets);
    case "wildlife":
      return all.filter(matchesWildlife);
    default:
      return all;
  }
}

/** Default upload buckets — user-facing labels only. */
export const ALBUM_UPLOAD_BUCKETS = [
  { key: "general", label: "General memories" },
  { key: "weekend", label: "Weekend trip" },
  { key: "gathering", label: "Gathering" },
  { key: "trails", label: "Trails & land" },
  { key: "projects", label: "Projects & upkeep" },
  { key: "wildlife", label: "Wildlife & nature" },
] as const;

export function albumBucketLabel(key?: string): string {
  return ALBUM_UPLOAD_BUCKETS.find((b) => b.key === key)?.label ?? "Family memories";
}

export function memoriesForWeekendHub(eventTitle: string, items: readonly AlbumMediaItem[]): AlbumMediaItem[] {
  const n = norm(eventTitle);
  return items.filter((m) => {
    const blob = norm(`${m.linkedEvent ?? ""} ${m.postTitle ?? ""} ${m.caption}`);
    if (!m.linkedEvent && !m.postTitle) return false;
    if (m.linkedEvent && norm(m.linkedEvent) === n) return true;
    if (m.linkedEvent && n.includes(norm(m.linkedEvent).slice(0, 12))) return true;
    if (blob.includes(n.slice(0, 10))) return true;
    return false;
  });
}

export type MemoryHighlight = {
  id: string;
  title: string;
  subtitle: string;
  items: AlbumMediaItem[];
};

/** Story-style groupings for the album hero — trip titles and album buckets. */
export function buildMemoryHighlights(items: readonly AlbumMediaItem[]): MemoryHighlight[] {
  const highlights: MemoryHighlight[] = [];
  const byEvent = new Map<string, AlbumMediaItem[]>();

  for (const m of items) {
    if (!m.linkedEvent?.trim()) continue;
    const key = m.linkedEvent.trim();
    const list = byEvent.get(key) ?? [];
    list.push(m);
    byEvent.set(key, list);
  }

  for (const [title, group] of byEvent) {
    if (group.length < 2) continue;
    highlights.push({
      id: `trip-${norm(title).replace(/\s+/g, "-").slice(0, 40)}`,
      title: `Memories from ${title}`,
      subtitle: `${group.length} moments · preserved for the family`,
      items: group.slice(0, 8),
    });
  }

  const byBucket = new Map<string, AlbumMediaItem[]>();
  for (const m of items) {
    if (m.source !== "upload" || !m.albumKey) continue;
    const list = byBucket.get(m.albumKey) ?? [];
    list.push(m);
    byBucket.set(m.albumKey, list);
  }

  for (const [key, group] of byBucket) {
    if (group.length < 3) continue;
    const label = albumBucketLabel(key);
    highlights.push({
      id: `bucket-${key}`,
      title: label,
      subtitle: `${group.length} photos you saved to the archive`,
      items: group.slice(0, 8),
    });
  }

  if (highlights.length === 0 && items.length > 0) {
    highlights.push({
      id: "recent-archive",
      title: "Moments from the property",
      subtitle: "Your living family archive — feed and uploads together",
      items: [...items].slice(0, 6),
    });
  }

  return highlights.slice(0, 4);
}

export function mergeAlbumCatalog(
  cloudUploads: readonly AlbumMediaItem[],
  feedBacked: readonly AlbumMediaItem[]
): AlbumMediaItem[] {
  const bySrc = new Map<string, AlbumMediaItem>();
  for (const m of cloudUploads) {
    if (m.src) bySrc.set(m.src, m);
  }
  for (const m of feedBacked) {
    if (!m.src) continue;
    if (!bySrc.has(m.src)) bySrc.set(m.src, m);
  }
  return [...bySrc.values()].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
}
