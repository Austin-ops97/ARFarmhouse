"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { UiFeedPost } from "@/models/feed-post";
import { subscribeFeedPosts } from "@/services/feed-posts";

type FeedPostsContextValue = {
  posts: UiFeedPost[];
  loading: boolean;
  error: string | null;
};

const FeedPostsContext = createContext<FeedPostsContextValue | null>(null);

export function FeedPostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<UiFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeFeedPosts(
      (p) => {
        setPosts(p);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const value = useMemo(() => ({ posts, loading, error }), [error, loading, posts]);

  return <FeedPostsContext.Provider value={value}>{children}</FeedPostsContext.Provider>;
}

export function useFeedPosts(): FeedPostsContextValue {
  const ctx = useContext(FeedPostsContext);
  if (!ctx) throw new Error("useFeedPosts must be used within FeedPostsProvider");
  return ctx;
}
