"use client";

import { collection, onSnapshot } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/contexts/auth-context";
import { tryGetFirestoreDb } from "@/lib/firebase";

type SavedPostsContextValue = {
  savedIds: ReadonlySet<string>;
  isSaved: (postId: string) => boolean;
  ready: boolean;
};

const SavedPostsContext = createContext<SavedPostsContextValue | null>(null);

export function SavedPostsProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth();
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!configured || !user?.uid) {
      queueMicrotask(() => {
        setSavedIds(new Set());
        setReady(true);
      });
      return;
    }
    const db = tryGetFirestoreDb();
    if (!db) {
      setReady(true);
      return;
    }
    setReady(false);
    const ref = collection(db, "users", user.uid, "savedPosts");
    return onSnapshot(
      ref,
      (snap) => {
        const ids = new Set<string>();
        snap.forEach((d) => ids.add(d.id));
        setSavedIds(ids);
        setReady(true);
      },
      () => {
        setSavedIds(new Set());
        setReady(true);
      }
    );
  }, [configured, user?.uid]);

  const value = useMemo<SavedPostsContextValue>(
    () => ({
      savedIds,
      isSaved: (postId) => savedIds.has(postId),
      ready,
    }),
    [ready, savedIds]
  );

  return <SavedPostsContext.Provider value={value}>{children}</SavedPostsContext.Provider>;
}

export function useSavedPosts(): SavedPostsContextValue {
  const ctx = useContext(SavedPostsContext);
  if (!ctx) throw new Error("useSavedPosts must be used within SavedPostsProvider");
  return ctx;
}
