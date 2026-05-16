"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ImagePlus, PenLine } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";

import {
  CreatePostDialog,
  type LivePollPayload,
  type LivePostPayload,
} from "@/components/ar-farmhouse/create-post-dialog";
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
import {
  buildOptimisticFeedPost,
  buildOptimisticPollPost,
  mergeOptimisticUploadProgress,
  patchOptimisticFeedPostMediaDimensions,
} from "@/lib/optimistic-feed-post";
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
  createPollFeedPost,
  finalizeFeedPostFromOptimizedArtifacts,
  isFeedPostMediaDisplayReady,
  prepareFeedPostPublishingArtifacts,
  type CreateFeedPostInput,
  type CreatePollFeedPostInput,
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
          <Skeleton className="ar-skeleton-shimmer relative min-h-[220px] w-full rounded-[1.5rem] bg-muted/50 sm:rounded-[1.75rem] dark:bg-white/[0.06]" />
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
  "ar-feed-composer ar-touch-press flex w-full min-h-[2.75rem] items-center gap-3 rounded-[1.75rem] px-3.5 py-2.5 text-left",
  "transition-[border-color,background-color,box-shadow,transform] duration-300",
  "hover:shadow-[var(--ar-float-elevate)] active:scale-[0.995]",
  "sm:min-h-[3rem] sm:gap-3.5 sm:rounded-[1.75rem] sm:px-4 sm:py-3"
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
  const retryPollPayloadsRef = useRef(new Map<string, CreatePollFeedPostInput>());
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

  const handlePublishPoll = useCallback(
    async (payload: LivePollPayload) => {
      if (!user) throw new Error("Sign in to publish to the family feed.");

      let postId: string;
      try {
        postId = allocateFeedPostDocId();
      } catch {
        throw new Error("Firestore unavailable. Check your connection and try again.");
      }

      const expiresAtMs = payload.expiresAt?.getTime() ?? null;
      const baseRow = buildOptimisticPollPost({
        id: postId,
        authorId: user.uid,
        authorDisplayName: displayName || "Member",
        authorPhotoUrl: avatarUrl ?? null,
        question: payload.question,
        optionTexts: payload.options,
        allowMultiple: payload.allowMultiple,
        expiresAtMs,
        location: payload.location,
      });

      const input: CreatePollFeedPostInput = {
        authorId: user.uid,
        authorDisplayName: displayName || "Member",
        authorPhotoUrl: avatarUrl ?? null,
        question: payload.question,
        optionTexts: payload.options,
        allowMultiple: payload.allowMultiple,
        expiresAt: payload.expiresAt,
        location: payload.location,
      };

      retryPollPayloadsRef.current.set(postId, input);
      setOptimisticFeed((prev) => [baseRow, ...prev]);

      try {
        await createPollFeedPost(postId, input);
        retryPollPayloadsRef.current.delete(postId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not publish.";
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
        throw e;
      }
    },
    [avatarUrl, displayName, user]
  );

  const handleRetryOptimistic = useCallback(
    (postId: string) => {
      const pollInput = retryPollPayloadsRef.current.get(postId);
      if (pollInput) {
        setOptimisticFeed((prev) =>
          prev.map((row) =>
            row.id === postId
              ? {
                  ...row,
                  optimisticUpload: {
                    phase: "saving",
                    progress: 50,
                    message: "Retrying…",
                  },
                }
              : row
          )
        );
        void createPollFeedPost(postId, pollInput).catch((e) => {
          const msg = e instanceof Error ? e.message : "Could not publish.";
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
        });
        return;
      }

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
    retryPollPayloadsRef.current.delete(postId);
    setOptimisticFeed((prev) => {
      const row = prev.find((r) => r.id === postId);
      if (row) revokeUiFeedPostHandoffMedia(row);
      return prev.filter((r) => r.id !== postId);
    });
  }, []);

  return (
    <div className={cn(FEED_LAYOUT_CLASS, "pb-4 -mt-0.5 sm:mt-0")}>
      <div className={cn(FEED_STREAM_CLASS, "flex min-w-0 touch-pan-y flex-col")}>
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5 sm:mb-7"
          aria-label="Feed"
        >
          <div className="mb-2.5 flex items-end justify-between gap-4 sm:mb-3">
            <h1 className="font-heading text-[1.375rem] font-bold tracking-[-0.02em] text-foreground sm:text-3xl sm:font-semibold sm:tracking-tight">
              Feed
            </h1>
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="hidden shrink-0 items-center gap-2 rounded-2xl border border-border/50 bg-card/80 px-3.5 py-2 text-sm font-medium text-foreground shadow-[var(--ar-float-subtle)] transition-colors hover:bg-muted/70 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:border-white/14 dark:hover:bg-white/[0.07] sm:inline-flex"
            >
              <PenLine className="size-4 text-primary" aria-hidden />
              New post
            </button>
          </div>

          <motion.button
            type="button"
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.05, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setComposeOpen(true)}
            className={cn(composerBar)}
          >
            <Avatar size="default" className="size-9 shrink-0 ring-2 ring-background/75 sm:size-10">
              <AvatarImage src={meAvatar} alt="" />
              <AvatarFallback>{meName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 text-[15px] leading-snug text-muted-foreground/85 sm:text-[15px]">
              Share a moment with the family
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-border/45 bg-card/65 text-primary sm:size-9 dark:border-white/[0.08] dark:bg-white/[0.04]">
              <ImagePlus className="size-[17px]" aria-hidden />
            </span>
          </motion.button>
        </motion.section>

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
              <div className="rounded-[1.5rem] border border-border/45 bg-card/75 px-6 py-14 text-center shadow-[var(--ar-float-subtle)] dark:border-white/[0.08] dark:bg-white/[0.03] sm:rounded-[1.75rem]">
                <p className="font-heading text-xl font-semibold text-foreground">No family updates yet</p>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Share your first memory — a photo from the porch, a note from the weekend, or a quiet update from the
                  property.
                </p>
                <button
                  type="button"
                  onClick={() => setComposeOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-primary/16"
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
              "ar-touch-press fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-30 flex size-14 items-center justify-center rounded-full border border-primary/25 sm:right-4",
              "bg-primary text-primary-foreground shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)] dark:border-white/10 dark:shadow-[0_18px_44px_-14px_rgba(0,0,0,0.7)] lg:hidden"
            )}
            aria-label="Create post"
          >
            <PenLine className="size-6" />
          </motion.button>
        )}

        <CreatePostDialog
          open={composeOpen}
          onOpenChange={setComposeOpen}
          canPublish={canPublish}
          onPublishLive={handlePublishLive}
          onPublishPoll={handlePublishPoll}
        />
      </div>

      <aside className={FEED_RAIL_CLASS}>
        <FeedRail />
      </aside>
    </div>
  );
}
