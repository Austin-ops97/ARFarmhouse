import type { Timestamp } from "firebase/firestore";

import type { FeedPostCategory } from "@/models/feed-post-category";
import type { MediaProcessingStatus } from "@/models/media-processing";

export type { FeedPostCategory };

export type OptimisticUploadPhase = "preparing" | "optimizing" | "uploading" | "saving" | "failed";

/** Client-only state while a post finishes optimize → Storage → Firestore. */
export type OptimisticFeedUpload = {
  phase: OptimisticUploadPhase;
  /** 0–100 overall perceptual progress for subtle UI. */
  progress: number;
  message?: string;
  /** Set when phase is `"failed"` */
  error?: string;
};

export type UiFeedPost = {
  id: string;
  authorId: string;
  category: FeedPostCategory;
  layout: "hero" | "standard" | "tall";
  author: { name: string; handle: string; avatar: string };
  timeLabel: string;
  location?: string;
  title?: string;
  body: string;
  kind: "image" | "album" | "text" | "video" | "event_recap";
  cover?: string;
  album?: string[];
  video?: { poster: string; duration: string };
  linkedEvent?: string;
  reactions: { emoji: string; count: number; active?: boolean }[];
  reactionCounts: Record<string, number>;
  commentsPreview: { author: string; text: string }[];
  commentCount: number;
  /**
   * Pixel dimensions aligned with backing `mediaUrls` (Firestore order).
   * Used for orientation-aware in-feed sizing when present (`mediaMeta` on write).
   */
  mediaDimensions?: ({ width: number; height: number } | undefined)[];
  /** Parallel with {@link album}/{@link cover} — fullscreen URLs when backend variants exist */
  mediaFullUrls?: (string | undefined)[];
  /** Local-only optimistic row merged above the realtime list */
  optimistic?: boolean;
  optimisticUpload?: OptimisticFeedUpload;
};

export type FeedMediaAttachmentMeta = {
  width: number;
  height: number;
  originalMime: string;
  optimizedSizeBytes: number;
  skippedOptimization: boolean;
  /** Pending until Firebase Functions finishes Sharp variants */
  processingStatus?: MediaProcessingStatus;
  rawStoragePath?: string | null;
  thumbnailUrl?: string | null;
  /** Canonical CDN URL for in-feed scrolling — mirrors {@link FirestorePost.mediaUrls}[i] once ready */
  feedUrl?: string | null;
  fullUrl?: string | null;
};

export type FirestorePost = {
  authorId: string;
  authorDisplayName: string;
  authorPhotoUrl: string | null;
  category: FeedPostCategory;
  title?: string | null;
  body: string;
  location?: string | null;
  linkedEvent?: string | null;
  mediaUrls: string[];
  /** Parallel with {@link mediaUrls} indices — client-added metadata after optimization (optional on legacy posts). */
  mediaMeta?: FeedMediaAttachmentMeta[];
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
  commentCount: number;
  reactionCounts?: Record<string, number>;
};
