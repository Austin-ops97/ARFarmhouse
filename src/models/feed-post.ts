import type { Timestamp } from "firebase/firestore";

import type { DemoPostCategory } from "@/lib/social-demo";

export type { DemoPostCategory as FeedPostCategory } from "@/lib/social-demo";

export type UiFeedPost = {
  id: string;
  category: DemoPostCategory;
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
  commentsPreview: { author: string; text: string }[];
  commentCount: number;
};

export type FirestorePost = {
  authorId: string;
  authorDisplayName: string;
  authorPhotoUrl: string | null;
  category: DemoPostCategory;
  title?: string | null;
  body: string;
  location?: string | null;
  linkedEvent?: string | null;
  mediaUrls: string[];
  createdAt: Timestamp;
  updatedAt?: Timestamp | null;
  commentCount: number;
};
