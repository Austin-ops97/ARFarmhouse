"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { extractAlbumMediaFromPosts, type AlbumMediaItem } from "@/lib/photo-album-media";
import type { UiFeedPost } from "@/models/feed-post";

const MANUAL_KEY = "ar-album-manual-v1";

type StoredManual = Omit<AlbumMediaItem, "source"> & { source: "upload" };

function readManual(): AlbumMediaItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MANUAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredManual[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => ({ ...p, source: "upload" as const }));
  } catch {
    return [];
  }
}

function writeManual(items: AlbumMediaItem[]) {
  try {
    const uploads = items.filter((i) => i.source === "upload");
    localStorage.setItem(MANUAL_KEY, JSON.stringify(uploads));
  } catch {
    /* quota */
  }
}

type PhotoAlbumContextValue = {
  /** Current feed-backed catalog (synced from FeedView) */
  allItems: AlbumMediaItem[];
  setFeedPosts: (posts: readonly UiFeedPost[]) => void;
  addUploadItems: (items: AlbumMediaItem[]) => void;
  removeUpload: (id: string) => void;
};

const PhotoAlbumContext = createContext<PhotoAlbumContextValue | null>(null);

export function PhotoAlbumProvider({ children }: { children: ReactNode }) {
  const [feedPosts, setFeedPostsState] = useState<readonly UiFeedPost[]>([]);
  const [manual, setManual] = useState<AlbumMediaItem[]>([]);

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate manual uploads from localStorage
    setManual(readManual());
  }, []);

  const feedBacked = useMemo(() => extractAlbumMediaFromPosts(feedPosts), [feedPosts]);

  const allItems = useMemo(() => {
    const bySrc = new Map<string, AlbumMediaItem>();
    for (const m of [...manual, ...feedBacked]) {
      bySrc.set(m.src, m);
    }
    return [...bySrc.values()];
  }, [manual, feedBacked]);

  const setFeedPosts = useCallback((posts: readonly UiFeedPost[]) => {
    setFeedPostsState(posts);
  }, []);

  const addUploadItems = useCallback((items: AlbumMediaItem[]) => {
    setManual((prev) => {
      const next = [...items, ...prev];
      writeManual(next);
      return next;
    });
  }, []);

  const removeUpload = useCallback((id: string) => {
    setManual((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writeManual(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      allItems,
      setFeedPosts,
      addUploadItems,
      removeUpload,
    }),
    [allItems, setFeedPosts, addUploadItems, removeUpload]
  );

  return <PhotoAlbumContext.Provider value={value}>{children}</PhotoAlbumContext.Provider>;
}

export function usePhotoAlbum(): PhotoAlbumContextValue {
  const v = useContext(PhotoAlbumContext);
  if (!v) throw new Error("usePhotoAlbum must be used within PhotoAlbumProvider");
  return v;
}
