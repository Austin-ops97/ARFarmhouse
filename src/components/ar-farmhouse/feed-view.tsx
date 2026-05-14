"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ImagePlus, PenLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CreatePostDialog } from "@/components/ar-farmhouse/create-post-dialog";
import { FeedPostCard } from "@/components/ar-farmhouse/feed-post-card";
import { FeedRail } from "@/components/ar-farmhouse/feed-rail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { FEED_LAYOUT_CLASS, FEED_RAIL_CLASS, FEED_STREAM_CLASS } from "@/lib/feed-layout";
import { demoFamilyMembers, demoFeedPosts, type DemoFeedPost } from "@/lib/social-demo";
import { cn } from "@/lib/utils";

const BATCH = 4;
const MAX_VISIBLE = 36;

function sliceFeed(start: number, take: number): DemoFeedPost[] {
  const out: DemoFeedPost[] = [];
  for (let i = 0; i < take; i++) {
    const base = demoFeedPosts[(start + i) % demoFeedPosts.length];
    out.push({ ...base, id: `${base.id}~${start + i}` });
  }
  return out;
}

function FeedSkeleton() {
  return (
    <div className="space-y-10">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <Skeleton className="size-10 rounded-full bg-white/[0.08]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28 rounded-full bg-white/[0.08]" />
              <Skeleton className="h-2.5 w-40 rounded-full bg-white/[0.06]" />
            </div>
          </div>
          <Skeleton className="ar-skeleton-shimmer aspect-[4/5] w-full rounded-none bg-white/[0.06] sm:rounded-2xl" />
          <div className="flex gap-2 px-1 pt-1">
            <Skeleton className="size-8 rounded-full bg-white/[0.06]" />
            <Skeleton className="size-8 rounded-full bg-white/[0.06]" />
            <Skeleton className="size-8 rounded-full bg-white/[0.06]" />
          </div>
          <div className="space-y-2 px-1 pt-2">
            <Skeleton className="h-3 w-24 rounded-full bg-white/[0.06]" />
            <Skeleton className="h-3 w-full rounded-full bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

const composerBar = cn(
  "flex w-full items-center gap-3 rounded-2xl border border-white/[0.08]",
  "bg-white/[0.045] px-3 py-2.5 text-left shadow-[0_16px_48px_-32px_rgba(0,0,0,0.75)] backdrop-blur-xl",
  "transition-[border-color,background-color,box-shadow] duration-300 hover:border-white/14 hover:bg-white/[0.06]",
  "sm:rounded-[1.35rem] sm:px-4 sm:py-3"
);

export function FeedView() {
  const reduceMotion = useReducedMotion();
  const [bootLoading, setBootLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [posts, setPosts] = useState<DemoFeedPost[]>(() => sliceFeed(0, BATCH));
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const me = demoFamilyMembers[3];

  useEffect(() => {
    const t = window.setTimeout(() => setBootLoading(false), reduceMotion ? 120 : 680);
    return () => window.clearTimeout(t);
  }, [reduceMotion]);

  useEffect(() => {
    if (bootLoading) return;
    const el = loadMoreRef.current;
    if (!el || posts.length >= MAX_VISIBLE) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingMore) return;
        setLoadingMore(true);
        window.setTimeout(() => {
          setPosts((prev) => {
            if (prev.length >= MAX_VISIBLE) return prev;
            const nextLen = Math.min(prev.length + BATCH, MAX_VISIBLE);
            const add = nextLen - prev.length;
            return [...prev, ...sliceFeed(prev.length, add)];
          });
          setLoadingMore(false);
        }, reduceMotion ? 100 : 420);
      },
      { rootMargin: "320px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [bootLoading, loadingMore, posts.length, reduceMotion]);

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
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Feed</h1>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Moments from AR Farmhouse — private, warm, and built to scroll.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            className="hidden shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-medium text-foreground shadow-inner shadow-white/5 transition-colors hover:border-white/16 hover:bg-white/[0.08] sm:inline-flex"
          >
            <PenLine className="size-4 text-primary" aria-hidden />
            New post
          </button>
        </motion.header>

        <div
            className={cn(
            "sticky z-20 -mx-3 mb-5 border-b border-white/[0.07] bg-background/82 px-3 py-3 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/65 sm:-mx-4 sm:px-4",
            "top-[var(--ar-mobile-sticky-top,calc(env(safe-area-inset-top)+4rem))] sm:top-4 lg:top-6",
            "sm:-mx-0 sm:mb-7 sm:rounded-[1.35rem] sm:border sm:border-white/[0.09] sm:bg-white/[0.035] sm:px-4 sm:py-3 sm:shadow-[0_20px_50px_-28px_rgba(0,0,0,0.72)]"
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
              <AvatarImage src={me.avatar} alt="" />
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 text-[15px] text-muted-foreground">
              What&apos;s happening at the property?
            </span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-primary">
              <ImagePlus className="size-[18px]" aria-hidden />
            </span>
          </motion.button>
        </div>

        {bootLoading ? (
          <FeedSkeleton />
        ) : (
          <>
            <div className="space-y-0">
              {posts.map((post) => (
                <FeedPostCard key={post.id} post={post} />
              ))}
            </div>

            <div ref={loadMoreRef} className="h-px w-full shrink-0" aria-hidden />

            {loadingMore && posts.length < MAX_VISIBLE && (
              <div className="flex justify-center py-8">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="size-2 rounded-full bg-primary/60"
                      animate={reduceMotion ? {} : { opacity: [0.35, 1, 0.35], y: [0, -3, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.12, ease: "easeInOut" }}
                    />
                  ))}
                </div>
              </div>
            )}

            {posts.length >= MAX_VISIBLE && (
              <p className="pb-8 pt-4 text-center text-sm text-muted-foreground">You&apos;re caught up for now.</p>
            )}
          </>
        )}

        {!composeOpen && (
          <motion.button
            type="button"
            onClick={() => setComposeOpen(true)}
            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            className={cn(
              "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-30 flex size-14 items-center justify-center rounded-full border border-white/12 sm:right-4",
              "bg-primary text-primary-foreground shadow-[0_18px_50px_-18px_rgba(0,0,0,0.75)] lg:hidden"
            )}
            aria-label="Create post"
          >
            <PenLine className="size-6" />
          </motion.button>
        )}

        <CreatePostDialog open={composeOpen} onOpenChange={setComposeOpen} />
      </div>

      <aside className={FEED_RAIL_CLASS}>
        <div className="sticky top-8 space-y-4">
          <FeedRail />
        </div>
      </aside>
    </div>
  );
}
