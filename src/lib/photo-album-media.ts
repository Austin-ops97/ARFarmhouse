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

function matchesThisWeekend(m: AlbumMediaItem): boolean {
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
  const t = norm(`${m.postTitle ?? ""} ${m.caption}`);
  return m.feedCategory === "project" || t.includes("dock") || t.includes("construction") || t.includes("stain");
}

function matchesTrails(m: AlbumMediaItem): boolean {
  const t = norm(`${m.postTitle ?? ""} ${m.caption} ${m.linkedEvent ?? ""}`);
  return t.includes("trail") || t.includes("mile") || t.includes("east trail");
}

function matchesSunsets(m: AlbumMediaItem): boolean {
  const t = norm(`${m.postTitle ?? ""} ${m.caption}`);
  return t.includes("sunset") || t.includes("golden hour") || t.includes("rose");
}

function matchesWildlife(m: AlbumMediaItem): boolean {
  return m.feedCategory === "wildlife" || norm(m.caption).includes("elk") || norm(m.postTitle ?? "").includes("elk");
}

export function shelfItems(shelfId: AlbumShelfId, items: readonly AlbumMediaItem[]): AlbumMediaItem[] {
  const all = [...items];
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

/** Album picker labels for uploads — demo only */
export const MOCK_ALBUM_LABELS = [
  { key: "general", label: "General memories" },
  { key: "memorial-2026", label: "Memorial Day 2026" },
  { key: "fishing-weekend", label: "Fishing weekend" },
  { key: "dock-build", label: "Dock construction" },
  { key: "summer-trails", label: "Summer trail rides" },
  { key: "gatherings", label: "Family gatherings" },
] as const;

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
