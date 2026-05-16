"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ImagePlus, PenLine } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";

import { CreatePostDialog, type LivePostPayload } from "@/components/ar-farmhouse/create-post-dialog";
import { FeedPostCard } from "@/components/ar-farmhouse/feed-post-card";
import { FeedRail } from "@/components/ar-farmhouse/feed-rail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useSettingsPrefs } from "@/contexts/settings-prefs-context";
import { usePhotoAlbum } from "@/contexts/photo-album-context";
import { useFeedPosts } from "@/contexts/feed-posts-context";
import { FEED_LAYOUT_CLASS, FEED_RAIL_CLASS, FEED_STREAM_CLASS } from "@/lib/feed-layout";
import { enqueueCpuBoundMediaTask } from "@/lib/media-upload-queue";
import { buildOptimisticFeedPost, mergeOptimisticUploadProgress, patchOptimisticFeedPostMediaDimensions } from "@/lib/optimistic-feed-post";
import { probeImageDimensions } from "@/lib/image-dimensions";
import { postsSignature } from "@/lib/mutation-lifecycle";
import { deferMediaCpuWork } from "@/lib/image-scheduler";
import { handoffEphemeralImageFromFile, revokeUiFeedPostHandoffMedia } from "@/lib/ephemeral-media-handoff";
import { isMobileUploadHost, mobileUploadLog } from "@/lib/mobile-upload-debug";
import { createRafProgressBridge } from "@/lib/upload-progress-bridge";
import type { UiFeedPost } from "@/models/feed-post";
import { uploadFinalizeTrace } from "@/lib/upload-log";
import { startUploadTrace } from "@/lib/upload-trace";
import {
  allocateFeedPostDocId,
  finalizeFeedPostFromOptimizedArtifacts,
  isFeedPostMediaDisplayReady,
  prepareFeedPostPublishingArtifacts,
  type CreateFeedPostInput,
  type FeedPublishProgress,
} from "@/services/feed-posts";
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
          <Skeleton className="ar-skeleton-shimmer relative min-h-[220px] w-full rounded-none bg-muted/50 sm:rounded-2xl dark:bg-white/[0.06]" />
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
  const [optimisticFeed, setOptimisticFeed] = useState<UiFeedPost[]>([]);

  const { posts, loading: liveLoading, error: liveError } = useFeedPosts();
  const feedPostsSigRef = useRef("");
  const retryFeedPayloadsRef = useRef(new Map<string, CreateFeedPostInput>());
  const abortFinalizeRef = useRef(new Map<string, AbortController>());

  const meAvatar = avatarUrl ?? undefined;
  const meName = displayName;

  const { setFeedPosts } = usePhotoAlbum();

  useEffect(() => {
    const remoteIds = new Set(posts.map((p) => p.id));
    startTransition(() => {
      setOptimisticFeed((prev) => {
        const next = prev.filter((o) => !remoteIds.has(o.id));
        for (const dropped of prev) {
          if (remoteIds.has(dropped.id)) {
            revokeUiFeedPostHandoffMedia(dropped);
          }
        }
        return next;
      });
    });
  }, [posts]);

  useEffect(() => {
    const sig = postsSignature(posts);
    if (sig === feedPostsSigRef.current) return;
    feedPostsSigRef.current = sig;
    startTransition(() => setFeedPosts(posts));
  }, [posts, setFeedPosts]);

  const mergedPosts = useMemo(() => {
    const remoteIds = new Set(posts.map((p) => p.id));
    const optimisticById = new Map(optimisticFeed.map((o) => [o.id, o]));
    const displayRemote = posts.filter((p) => {
      const optimistic = optimisticById.get(p.id);
      if (!optimistic) return true;
      return isFeedPostMediaDisplayReady(p);
    });
    const pending = optimisticFeed.filter((o) => {
      if (!remoteIds.has(o.id)) return true;
      const remote = posts.find((p) => p.id === o.id);
      return remote ? !isFeedPostMediaDisplayReady(remote) : true;
    });
    return [...pending, ...displayRemote];
  }, [optimisticFeed, posts]);

  const canPublish = Boolean(configured && user && !authLoading);

  const runFinalizeFeedJob = useCallback((postId: string, input: CreateFeedPostInput) => {
    abortFinalizeRef.current.get(postId)?.abort();
    const ac = new AbortController();
    abortFinalizeRef.current.set(postId, ac);
    retryFeedPayloadsRef.current.set(postId, input);

    void (async () => {
      await deferMediaCpuWork();
      const runId =
        typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${postId}-${Date.now()}`;
      const trace = startUploadTrace(runId, `feed_finalize:${postId}`);
      trace("finalize job scheduled", { segment: "meta", fileCount: input.files.length });
      const scheduleProgress = createRafProgressBridge<FeedPublishProgress>((p) => {
        if (p.phase === "uploading" && p.done >= p.total && (p.percent ?? 100) >= 100) {
          setOptimisticFeed((prev) =>
            prev.map((row) =>
              row.id === postId
                ? {
                    ...row,
                    optimisticUpload: {
                      phase: "saving",
                      progress: 96,
                      message: "Saving post…",
                    },
                  }
                : row
            )
          );
          return;
        }
        const next = mergeOptimisticUploadProgress(p);
        setOptimisticFeed((prev) =>
          prev.map((row) => (row.id === postId ? { ...row, optimisticUpload: next } : row))
        );
      });
      try {
        const finalizeOpts = {
          signal: ac.signal,
          onProgress: scheduleProgress,
          trace,
        } as const;
        if (input.files.length === 0) {
          await finalizeFeedPostFromOptimizedArtifacts(postId, input, [], finalizeOpts);
        } else {
          trace("waiting for CPU queue (normalize)", { segment: "cpu" });
          const artifacts = await enqueueCpuBoundMediaTask(() =>
            prepareFeedPostPublishingArtifacts(input.files, finalizeOpts)
          );
          trace("CPU queue released — uploading outside mutex", {
            segment: "storage",
            artifactCount: artifacts.length,
          });
          await finalizeFeedPostFromOptimizedArtifacts(postId, input, artifacts, finalizeOpts);
        }
        retryFeedPayloadsRef.current.delete(postId);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        const msg = e instanceof Error ? e.message : "Could not publish.";
        uploadFinalizeTrace("finalize failed", { domain: "feed", postId, error: msg });
        setOptimisticFeed((prev) =>
          prev.map((row) =>
            row.id === postId
              ? {
                  ...row,
                  optimisticUpload: {
                    phase: "failed",
                    progress: row.optimisticUpload?.progress ?? 0,
                    error: msg,
                  },
                }
              : row
          )
        );
      } finally {
        abortFinalizeRef.current.delete(postId);
      }
    })();
  }, []);

  const handlePublishLive = useCallback(
    async (payload: LivePostPayload) => {
      if (!user) throw new Error("Sign in to publish to the family feed.");

      let postId: string;
      try {
        postId = allocateFeedPostDocId();
      } catch {
        throw new Error("Firestore unavailable. Check your connection and try again.");
      }

      /** File-backed URLs avoid `fetch(blob:)` cloning — critical on Mobile Safari memory. */
      const previewHandoff = payload.files.map((f) => handoffEphemeralImageFromFile(f) ?? "").filter(Boolean);
      mobileUploadLog("feed optimistic previews wired from File refs", {
        count: previewHandoff.length,
        bytes: payload.files.reduce((n, f) => n + f.size, 0),
      });

      const baseRow = buildOptimisticFeedPost({
        id: postId,
        authorId: user.uid,
        authorDisplayName: displayName || "Member",
        authorPhotoUrl: avatarUrl ?? null,
        caption: payload.caption,
        location: payload.location,
        postType: payload.postType,
        attachedEvent: payload.attachedEvent,
        imagePreviewUrls: previewHandoff,
      });

      const input: CreateFeedPostInput = {
        authorId: user.uid,
        authorDisplayName: displayName || "Member",
        authorPhotoUrl: avatarUrl ?? null,
        category: payload.postType,
        body: payload.caption,
        location: payload.location,
        linkedEvent: payload.attachedEvent,
        files: payload.files,
      };

      setOptimisticFeed((prev) => [baseRow, ...prev]);
      if (payload.files.length > 0) {
        void (async () => {
          const runners = payload.files.map(async (file, idx) => {
            const dims = await probeImageDimensions(file);
            if (!dims?.width || !dims?.height) return;
            setOptimisticFeed((prev) =>
              patchOptimisticFeedPostMediaDimensions(prev, postId, idx, {
                width: dims.width,
                height: dims.height,
              })
            );
          });
          if (isMobileUploadHost()) {
            for (const r of runners) await r;
          } else {
            await Promise.all(runners);
          }
        })();
      }
      runFinalizeFeedJob(postId, input);
    },
    [avatarUrl, displayName, runFinalizeFeedJob, user]
  );

  const handleRetryOptimistic = useCallback(
    (postId: string) => {
      const input = retryFeedPayloadsRef.current.get(postId);
      if (!input) return;
      abortFinalizeRef.current.get(postId)?.abort();
      setOptimisticFeed((prev) =>
        prev.map((row) =>
          row.id === postId
            ? {
                ...row,
                optimisticUpload: {
                  phase: "preparing",
                  progress: 4,
                  message: "Retrying…",
                },
              }
            : row
        )
      );
      runFinalizeFeedJob(postId, input);
    },
    [runFinalizeFeedJob]
  );

  const handleDismissOptimistic = useCallback((postId: string) => {
    abortFinalizeRef.current.get(postId)?.abort();
    abortFinalizeRef.current.delete(postId);
    retryFeedPayloadsRef.current.delete(postId);
    setOptimisticFeed((prev) => {
      const row = prev.find((r) => r.id === postId);
      if (row) revokeUiFeedPostHandoffMedia(row);
      return prev.filter((r) => r.id !== postId);
    });
  }, []);

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
            {mergedPosts.length === 0 && (
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
              {mergedPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  highlightId={highlightPostId}
                  suppressMedia={!prefs.feedRichMedia || prefs.behaviorDataSaver}
                  onRetryOptimisticFeed={() => handleRetryOptimistic(post.id)}
                  onDismissOptimisticFeed={() => handleDismissOptimistic(post.id)}
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

        <CreatePostDialog open={composeOpen} onOpenChange={setComposeOpen} canPublish={canPublish} onPublishLive={handlePublishLive} />
      </div>

      <aside className={FEED_RAIL_CLASS}>
        <FeedRail />
      </aside>
    </div>
  );
}
