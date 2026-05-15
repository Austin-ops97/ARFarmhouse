"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/contexts/auth-context";
import {
  extractAlbumMediaFromPosts,
  mergeAlbumCatalog,
  type AlbumMediaItem,
} from "@/lib/photo-album-media";
import type { UiFeedPost } from "@/models/feed-post";
import { subscribeAlbumMedia } from "@/services/album-media";

export type AlbumLightboxTarget = {
  items: AlbumMediaItem[];
  index: number;
};

type PhotoAlbumContextValue = {
  allItems: AlbumMediaItem[];
  loading: boolean;
  error: string | null;
  setFeedPosts: (posts: readonly UiFeedPost[]) => void;
  refreshCloud: () => void;
  openLightbox: (target: AlbumLightboxTarget) => void;
  lightbox: AlbumLightboxTarget & { open: boolean };
  closeLightbox: () => void;
};

const PhotoAlbumContext = createContext<PhotoAlbumContextValue | null>(null);

export function PhotoAlbumProvider({ children }: { children: ReactNode }) {
  const { configured } = useAuth();
  const [feedPosts, setFeedPostsState] = useState<readonly UiFeedPost[]>([]);
  const [cloudUploads, setCloudUploads] = useState<AlbumMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<AlbumLightboxTarget & { open: boolean }>({
    open: false,
    items: [],
    index: 0,
  });

  useEffect(() => {
    if (!configured) {
      setCloudUploads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeAlbumMedia(
      (items) => {
        setCloudUploads(items);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [configured]);

  const feedBacked = useMemo(() => extractAlbumMediaFromPosts(feedPosts), [feedPosts]);

  const allItems = useMemo(
    () => mergeAlbumCatalog(cloudUploads, feedBacked),
    [cloudUploads, feedBacked]
  );

  const setFeedPosts = useCallback((posts: readonly UiFeedPost[]) => {
    setFeedPostsState(posts);
  }, []);

  const refreshCloud = useCallback(() => {
    /* Realtime listener keeps cloud fresh; hook for post-upload UX */
  }, []);

  const openLightbox = useCallback((target: AlbumLightboxTarget) => {
    setLightbox({ open: true, items: target.items, index: target.index });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightbox((s) => ({ ...s, open: false }));
  }, []);

  const value = useMemo(
    () => ({
      allItems,
      loading,
      error,
      setFeedPosts,
      refreshCloud,
      openLightbox,
      lightbox,
      closeLightbox,
    }),
    [allItems, loading, error, setFeedPosts, refreshCloud, openLightbox, lightbox, closeLightbox]
  );

  return <PhotoAlbumContext.Provider value={value}>{children}</PhotoAlbumContext.Provider>;
}

export function usePhotoAlbum(): PhotoAlbumContextValue {
  const v = useContext(PhotoAlbumContext);
  if (!v) throw new Error("usePhotoAlbum must be used within PhotoAlbumProvider");
  return v;
}
