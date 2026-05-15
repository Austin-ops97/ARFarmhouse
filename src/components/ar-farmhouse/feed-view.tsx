"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ImagePlus, PenLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState, startTransition } from "react";

import { CreatePostDialog } from "@/components/ar-farmhouse/create-post-dialog";
import { FeedPostCard } from "@/components/ar-farmhouse/feed-post-card";
import { FeedRail } from "@/components/ar-farmhouse/feed-rail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useSettingsPrefs } from "@/contexts/settings-prefs-context";
import { usePhotoAlbum } from "@/contexts/photo-album-context";
import { FEED_LAYOUT_CLASS, FEED_RAIL_CLASS, FEED_STREAM_CLASS } from "@/lib/feed-layout";
import type { FeedPostCategory } from "@/models/feed-post-category";
import type { UiFeedPost } from "@/models/feed-post";
import { postsSignature, runMutation } from "@/lib/mutation-lifecycle";
import { useFeedPosts } from "@/contexts/feed-posts-context";
import { createFeedPostWithMedia } from "@/services/feed-posts";
import { cn } from "@/lib/utils";

function FeedSkeleton() {
  return (
    <div className="space-y-10">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <Skeleton className="size-10 rounded-full bg-muted/80 dark:bg-white/[0.08]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28 rounded-full bg-muted/80 dark:bg-white/[0.08]" />
              <Skeleton className="h-2.5 w-40 rounded-full bg-muted/60 dark:bg-white/[0.06]" />
            </div>
          </div>
          <Skeleton className="ar-skeleton-shimmer aspect-[4/5] w-full rounded-none bg-muted/50 sm:rounded-2xl dark:bg-white/[0.06]" />
          <div className="flex gap-2 px-1 pt-1">
            <Skeleton className="size-8 rounded-full bg-muted/55 dark:bg-white/[0.06]" />
            <Skeleton className="size-8 rounded-full bg-muted/55 dark:bg-white/[0.06]" />
            <Skeleton className="size-8 rounded-full bg-muted/55 dark:bg-white/[0.06]" />
          </div>
          <div className="space-y-2 px-1 pt-2">
            <Skeleton className="h-3 w-24 rounded-full bg-muted/55 dark:bg-white/[0.06]" />
            <Skeleton className="h-3 w-full rounded-full bg-muted/55 dark:bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

const composerBar = cn(
  "ar-surface-float flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left",
  "transition-[border-color,background-color,box-shadow] duration-300 hover:shadow-[var(--ar-panel-elevate)]",
  "sm:rounded-[1.35rem] sm:px-4 sm:py-3"
);

export function FeedView({ highlightPostId }: { highlightPostId?: string | null }) {
  const reduceMotion = useReducedMotion();
  const { user, displayName, avatarUrl, loading: authLoading, configured } = useAuth();
  const { prefs } = useSettingsPrefs();
  const [composeOpen, setComposeOpen] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishPhase, setPublishPhase] = useState<
    "idle" | "preparing" | "optimizing" | "uploading" | "saving"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState<{
    done: number;
    total: number;
    percent?: number;
  } | null>(null);

  const { posts, loading: liveLoading, error: liveError } = useFeedPosts();
  const publishEpochRef = useRef(0);
  const feedPostsSigRef = useRef("");

  const meAvatar = avatarUrl ?? undefined;
  const meName = displayName;

  const { setFeedPosts } = usePhotoAlbum();

  useEffect(() => {
    const sig = postsSignature(posts);
    if (sig === feedPostsSigRef.current) return;
    feedPostsSigRef.current = sig;
    startTransition(() => setFeedPosts(posts));
  }, [posts, setFeedPosts]);

  const canPublish = Boolean(configured && user && !authLoading);

  const clearPublishState = useCallback(() => {
    setPublishBusy(false);
    setPublishPhase("idle");
    setUploadProgress(null);
  }, []);

  const handlePublishLive = useCallback(
    async (payload: {
      files: File[];
      caption: string;
      location: string;
      postType: FeedPostCategory;
      attachedEvent: string | null;
    }) => {
      if (!user) throw new Error("Sign in to publish to the family feed.");

      const epoch = ++publishEpochRef.current;
      const hasFiles = payload.files.length > 0;

      await runMutation(
        "feed",
        "publish",
        () =>
          createFeedPostWithMedia(
            {
              authorId: user.uid,
              authorDisplayName: displayName,
              authorPhotoUrl: avatarUrl,
              category: payload.postType,
              body: payload.caption,
              location: payload.location,
              linkedEvent: payload.attachedEvent,
              files: payload.files,
            },
            (progress) => {
              if (publishEpochRef.current !== epoch) return;
              if (progress.phase === "uploading") {
                setPublishPhase("uploading");
                setUploadProgress({
                  done: progress.done,
                  total: progress.total,
                  percent: progress.percent,
                });
                if (progress.done >= progress.total && (progress.percent ?? 100) >= 100) {
                  setPublishPhase("saving");
                }
                return;
              }
              setPublishPhase(progress.phase === "optimizing" ? "optimizing" : "preparing");
              setUploadProgress({ done: progress.done, total: progress.total });
            }
          ),
        {
          onStart: () => {
            setPublishBusy(true);
            setPublishPhase(hasFiles ? "preparing" : "saving");
            setUploadProgress(hasFiles ? { done: 0, total: payload.files.length } : null);
          },
          onFinally: () => {
            if (publishEpochRef.current !== epoch) return;
            clearPublishState();
          },
        }
      );
    },
    [avatarUrl, clearPublishState, displayName, user]
  );

  return (
    <div className={cn(FEED_LAYOUT_CLASS, "pb-4")}>
      <div className={cn(FEED_STREAM_CLASS, "flex min-w-0 flex-col")}>
        <motion.header
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5 flex items-end justify-between gap-4 sm:mb-7"
        >
          <div className="min-w-0 space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Family feed</h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Private updates, photos, and reactions for people signed in to this home.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="hidden shrink-0 items-center gap-2 rounded-xl border border-border/60 bg-card/85 px-3 py-2 text-sm font-medium text-foreground shadow-[var(--ar-float-elevate)] transition-colors hover:bg-muted/70 dark:border-white/10 dark:bg-white/[0.05] dark:shadow-inner dark:shadow-white/5 dark:hover:border-white/16 dark:hover:bg-white/[0.08] sm:inline-flex"
          >
            <PenLine className="size-4 text-primary" aria-hidden />
            New post
          </button>
        </motion.header>

        <div
          className={cn(
            "sticky z-20 -mx-3 mb-5 border-b border-border/50 bg-background/82 px-3 py-3 ar-header-blur supports-[backdrop-filter]:bg-background/70 sm:-mx-4 sm:px-4",
            "top-[var(--ar-mobile-sticky-top)] sm:top-[calc(var(--ar-header-height)+0.5rem)] lg:top-[calc(var(--ar-header-height)+0.75rem)]",
            "sm:-mx-0 sm:mb-7 sm:rounded-[1.35rem] sm:border sm:border-border/55 sm:bg-card/78 sm:px-4 sm:py-3 sm:shadow-[var(--ar-panel-elevate)] dark:border-white/[0.07] dark:bg-white/[0.035] dark:shadow-[0_20px_50px_-28px_rgba(0,0,0,0.72)]"
          )}
        >
          <motion.button
            type="button"
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setComposeOpen(true)}
            className={cn(composerBar)}
          >
            <Avatar size="default" className="ring-2 ring-background/80">
              <AvatarImage src={meAvatar} alt="" />
              <AvatarFallback>{meName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 text-[15px] text-muted-foreground">Share a moment with the family</span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card/80 text-primary dark:border-white/10 dark:bg-white/[0.05]">
              <ImagePlus className="size-[18px]" aria-hidden />
            </span>
          </motion.button>
        </div>

        {liveError && (
          <p className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/95">
            The feed could not sync: {liveError}
          </p>
        )}

        {liveLoading ? (
          <FeedSkeleton />
        ) : (
          <>
            {posts.length === 0 && (
              <div className="rounded-2xl border border-border/55 bg-card/80 px-6 py-14 text-center shadow-[var(--ar-float-elevate)] dark:border-white/10 dark:bg-white/[0.03]">
                <p className="font-heading text-xl font-semibold text-foreground">No family updates yet</p>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Share your first memory — a photo from the porch, a note from the weekend, or a quiet update from the
                  property.
                </p>
                <button
                  type="button"
                  onClick={() => setComposeOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-primary/35 bg-primary/12 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/18"
                >
                  <ImagePlus className="size-4 text-primary" aria-hidden />
                  Share your first memory
                </button>
              </div>
            )}

            <div className="space-y-0">
              {posts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  highlightId={highlightPostId}
                  suppressMedia={!prefs.feedRichMedia || prefs.behaviorDataSaver}
                />
              ))}
            </div>
          </>
        )}

        {!composeOpen && (
          <motion.button
            type="button"
            onClick={() => setComposeOpen(true)}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            className={cn(
              "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-30 flex size-14 items-center justify-center rounded-full border border-border/60 sm:right-4",
              "bg-primary text-primary-foreground shadow-[var(--ar-modal-elevate)] dark:border-white/12 dark:shadow-[0_18px_50px_-18px_rgba(0,0,0,0.75)] lg:hidden"
            )}
            aria-label="Create post"
          >
            <PenLine className="size-6" />
          </motion.button>
        )}

        <CreatePostDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          publishBusy={publishBusy}
          publishPhase={publishPhase}
          uploadProgress={uploadProgress}
          canPublish={canPublish}
          onPublishLive={handlePublishLive}
        />
      </div>

      <aside className={FEED_RAIL_CLASS}>
        <FeedRail />
      </aside>
    </div>
  );
}
