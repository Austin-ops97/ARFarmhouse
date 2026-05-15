import { formatFeedTimeLabel, handleFromDisplayName } from "@/lib/datetime/relative";
import { buildChipsFromCounts, normalizeReactionCounts } from "@/lib/reaction-counts";
import type { FeedPostCategory } from "@/models/feed-post-category";
import type { OptimisticFeedUpload, UiFeedPost } from "@/models/feed-post";
import type { FeedPublishProgress } from "@/services/feed-posts";

export function mergeOptimisticUploadProgress(p: FeedPublishProgress): OptimisticFeedUpload {
  if (p.phase === "uploading") {
    const t = Math.max(1, p.total);
    const mix = (p.done + (p.percent ?? 0) / 100) / t;
    const progress = Math.round(52 + Math.min(1, mix) * 48);
    return {
      phase: "uploading",
      progress,
      message:
        p.percent != null
          ? `Uploading… ${Math.round(mix * 100)}%`
          : `Uploading photo ${Math.min(p.done + 1, t)} of ${t}…`,
    };
  }

  const total = Math.max(1, p.total);
  if (p.phase === "optimizing") {
    const seg = Math.round((p.done / total) * 50);
    const progress = Math.min(51, 22 + seg);
    return {
      phase: "optimizing",
      progress,
      message:
        total > 1
          ? `Optimizing ${Math.min(p.done + 1, total)} of ${total}…`
          : "Optimizing photo for upload…",
    };
  }

  const prepSeg = Math.round((p.done / total) * 20);
  return {
    phase: "preparing",
    progress: Math.min(21, 2 + prepSeg),
    message:
      total > 1 ? `Preparing photos ${p.done + 1}/${total}…` : "Preparing photo for upload…",
  };
}

/** Local-only row shown at the top while Storage + Firestore catch up. */
export function buildOptimisticFeedPost(opts: {
  id: string;
  authorId: string;
  authorDisplayName: string;
  authorPhotoUrl: string | null;
  caption: string;
  location: string;
  postType: FeedPostCategory;
  attachedEvent: string | null;
  imagePreviewUrls: (string | null)[];
}): UiFeedPost {
  const {
    id,
    authorId,
    authorDisplayName,
    authorPhotoUrl,
    caption,
    location,
    postType,
    attachedEvent,
    imagePreviewUrls,
  } = opts;

  const urls = imagePreviewUrls.filter((u): u is string => typeof u === "string" && u.length > 0);

  let kind: UiFeedPost["kind"];
  if (urls.length === 0) kind = "text";
  else if (urls.length === 1) kind = postType === "weekend_recap" ? "event_recap" : "image";
  else kind = "album";

  const layout: UiFeedPost["layout"] =
    kind === "image" && postType === "wildlife"
      ? "hero"
      : kind === "album" && urls.length >= 3
        ? "tall"
        : "standard";

  const cover = kind === "image" || kind === "event_recap" ? urls[0] : undefined;
  const album = kind === "album" ? urls : undefined;
  const reactionCounts = normalizeReactionCounts({});

  const now = new Date();

  return {
    id,
    authorId,
    category: postType,
    layout,
    author: {
      name: authorDisplayName || "Member",
      handle: handleFromDisplayName(authorDisplayName ?? "member"),
      avatar: authorPhotoUrl ?? "",
    },
    timeLabel: formatFeedTimeLabel(now),
    location: location.trim() ? location : undefined,
    body: caption,
    kind,
    cover,
    album,
    linkedEvent: attachedEvent?.trim() ? attachedEvent : undefined,
    reactions: buildChipsFromCounts(reactionCounts, undefined).map((c) => ({
      emoji: c.emoji,
      count: c.count,
      active: c.active,
    })),
    reactionCounts,
    commentsPreview: [],
    commentCount: 0,
    optimistic: true,
    optimisticUpload: {
      phase: "preparing",
      progress: 3,
      message: "Preparing…",
    },
  };
}
