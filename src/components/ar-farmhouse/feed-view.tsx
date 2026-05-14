"use client";

import { motion, useReducedMotion } from "framer-motion";
import { PenLine, Rss } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatePostDialog } from "@/components/ar-farmhouse/create-post-dialog";
import { FeedPostCard } from "@/components/ar-farmhouse/feed-post-card";
import { demoFeedPosts } from "@/lib/social-demo";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={cn(surface, "ar-skeleton-shimmer overflow-hidden p-4")}>
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full bg-white/[0.08]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-28 rounded-full bg-white/[0.08]" />
              <Skeleton className="h-2 w-20 rounded-full bg-white/[0.06]" />
            </div>
          </div>
          <Skeleton className="mt-4 h-4 w-full rounded-full bg-white/[0.06]" />
              <Skeleton className="mt-2 h-4 w-[82%] max-w-md rounded-full bg-white/[0.06]" />
          <Skeleton className="mt-5 aspect-[16/10] w-full rounded-2xl bg-white/[0.06]" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-7 w-14 rounded-full bg-white/[0.06]" />
            <Skeleton className="h-7 w-14 rounded-full bg-white/[0.06]" />
            <Skeleton className="h-7 w-14 rounded-full bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedView() {
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), reduceMotion ? 120 : 720);
    return () => window.clearTimeout(t);
  }, [reduceMotion]);

  return (
    <div className="space-y-6">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          surface,
          "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        )}
      >
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
            <Rss className="size-5 text-primary" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Family feed</h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              A calm, private thread of real moments — not a timeline, not an audience. Just us.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-stretch md:flex-row">
          <Button type="button" className="rounded-2xl px-4" onClick={() => setComposeOpen(true)}>
            <PenLine className="size-4" data-icon="inline-start" />
            Create post
          </Button>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-center text-[10px] font-medium text-muted-foreground">
            Demo · static posts
          </span>
        </div>
      </motion.section>

      {loading ? (
        <FeedSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.35 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {demoFeedPosts.map((post) => (
            <div key={post.id} className={cn(post.layout === "hero" && "md:col-span-2")}>
              <FeedPostCard post={post} />
            </div>
          ))}
        </motion.div>
      )}

      {!composeOpen && (
        <motion.button
          type="button"
          onClick={() => setComposeOpen(true)}
          whileTap={reduceMotion ? undefined : { scale: 0.94 }}
          className={cn(
            "fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex size-14 items-center justify-center rounded-full border border-white/12",
            "bg-primary text-primary-foreground shadow-[0_18px_50px_-18px_rgba(0,0,0,0.75)] lg:hidden"
          )}
          aria-label="Create post"
        >
          <PenLine className="size-6" />
        </motion.button>
      )}

      <CreatePostDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </div>
  );
}
