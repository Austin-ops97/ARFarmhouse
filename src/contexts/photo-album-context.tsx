"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  startTransition,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { useAuth } from "@/contexts/auth-context";
import { revokeAlbumItemHandoffSrc } from "@/lib/ephemeral-media-handoff";
import {
  extractAlbumMediaFromPosts,
  mergeAlbumCatalog,
  type AlbumMediaItem,
} from "@/lib/photo-album-media";
import type { UiFeedPost } from "@/models/feed-post";
import { isAlbumMediaDisplayReady, subscribeAlbumMedia } from "@/services/album-media";

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
  /** Tiles shown immediately — cleared when realtime delivers matching ids */
  optimisticAlbumItems: AlbumMediaItem[];
  setOptimisticAlbumItems: Dispatch<SetStateAction<AlbumMediaItem[]>>;
  patchOptimisticAlbumItem: (id: string, patch: Partial<AlbumMediaItem>) => void;
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
  const [optimisticAlbumItems, setOptimisticAlbumItems] = useState<AlbumMediaItem[]>([]);

  useEffect(() => {
    if (!configured) {
      queueMicrotask(() => {
        setCloudUploads([]);
        setLoading(false);
      });
      return;
    }
    queueMicrotask(() => {
      setLoading(true);
    });
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

  useEffect(() => {
    const remoteById = new Map(cloudUploads.map((c) => [c.id, c]));
    startTransition(() => {
      setOptimisticAlbumItems((prev) => {
        const dropped = prev.filter((o) => {
          const remote = remoteById.get(o.id);
          return remote && isAlbumMediaDisplayReady(remote);
        });
        for (const o of dropped) {
          revokeAlbumItemHandoffSrc(o);
        }
        return prev.filter((o) => {
          const remote = remoteById.get(o.id);
          if (!remote) return true;
          return !isAlbumMediaDisplayReady(remote);
        });
      });
    });
  }, [cloudUploads]);

  const feedBacked = useMemo(() => extractAlbumMediaFromPosts(feedPosts), [feedPosts]);

  const allItems = useMemo(() => {
    const mergedRemote = mergeAlbumCatalog(cloudUploads, feedBacked);
    const optimisticById = new Map(optimisticAlbumItems.map((o) => [o.id, o]));
    const displayRemote = mergedRemote.filter((m) => {
      const optimistic = optimisticById.get(m.id);
      if (!optimistic) return true;
      return isAlbumMediaDisplayReady(m);
    });
    const pendingLocal = optimisticAlbumItems.filter((o) => {
      const remote = mergedRemote.find((m) => m.id === o.id);
      if (!remote) return true;
      return !isAlbumMediaDisplayReady(remote);
    });
    return [...pendingLocal, ...displayRemote].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
  }, [cloudUploads, feedBacked, optimisticAlbumItems]);

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

  const patchOptimisticAlbumItem = useCallback((id: string, patch: Partial<AlbumMediaItem>) => {
    setOptimisticAlbumItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
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
      optimisticAlbumItems,
      setOptimisticAlbumItems,
      patchOptimisticAlbumItem,
    }),
    [
      allItems,
      loading,
      error,
      setFeedPosts,
      refreshCloud,
      openLightbox,
      lightbox,
      closeLightbox,
      optimisticAlbumItems,
      patchOptimisticAlbumItem,
    ]
  );

  return <PhotoAlbumContext.Provider value={value}>{children}</PhotoAlbumContext.Provider>;
}

export function usePhotoAlbum(): PhotoAlbumContextValue {
  const v = useContext(PhotoAlbumContext);
  if (!v) throw new Error("usePhotoAlbum must be used within PhotoAlbumProvider");
  return v;
}
