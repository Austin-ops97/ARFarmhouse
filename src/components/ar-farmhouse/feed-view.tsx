"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ImagePlus, PenLine, Rss } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreatePostDialog } from "@/components/ar-farmhouse/create-post-dialog";
import { FeedPostCard } from "@/components/ar-farmhouse/feed-post-card";
import { FEED_COLUMN_CLASS } from "@/lib/feed-layout";
import { demoFamilyMembers, demoFeedPosts } from "@/lib/social-demo";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-2xl border border-white/10",
  "bg-white/[0.035] shadow-[0_20px_50px_-28px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:rounded-[1.15rem]"
);

function FeedSkeleton() {
  return (
    <div className={cn(FEED_COLUMN_CLASS, "space-y-4")}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={cn(surface, "ar-skeleton-shimmer overflow-hidden")}>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="size-9 rounded-full bg-white/[0.08]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-28 rounded-full bg-white/[0.08]" />
              <Skeleton className="h-2 w-36 rounded-full bg-white/[0.06]" />
            </div>
            <Skeleton className="size-8 rounded-full bg-white/[0.06]" />
          </div>
          <Skeleton className="aspect-[4/5] w-full rounded-none bg-white/[0.06]" />
          <div className="flex gap-2 px-2 py-2">
            <Skeleton className="size-9 rounded-full bg-white/[0.06]" />
            <Skeleton className="size-9 rounded-full bg-white/[0.06]" />
            <Skeleton className="size-9 rounded-full bg-white/[0.06]" />
          </div>
          <div className="space-y-2 px-3 pb-3">
            <Skeleton className="h-3 w-24 rounded-full bg-white/[0.06]" />
            <Skeleton className="h-3 w-full rounded-full bg-white/[0.06]" />
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

  const me = demoFamilyMembers[3];

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), reduceMotion ? 120 : 720);
    return () => window.clearTimeout(t);
  }, [reduceMotion]);

  return (
    <div className="space-y-5">
      <div className={FEED_COLUMN_CLASS}>
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={cn(surface, "flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 lg:p-6 xl:p-7")}
        >
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Rss className="size-[18px] text-primary" aria-hidden />
            </span>
            <div className="min-w-0 space-y-0.5">
              <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">Family feed</h2>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm lg:text-[15px]">
                Single column, like the apps you know — still private, still ours.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button type="button" className="rounded-xl px-3 sm:rounded-2xl sm:px-4" onClick={() => setComposeOpen(true)}>
              <PenLine className="size-4" data-icon="inline-start" />
              Create post
            </Button>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-center text-[10px] font-medium text-muted-foreground">
              Demo
            </span>
          </div>
        </motion.section>

        {/* Composer strip — FB / IG entry */}
        <motion.button
          type="button"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setComposeOpen(true)}
          className={cn(
            surface,
            "mt-4 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:border-white/16 sm:px-3.5 lg:px-5 lg:py-3"
          )}
        >
          <Avatar size="default" className="ring-2 ring-background/80">
            <AvatarImage src={me.avatar} alt="" />
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 text-sm text-muted-foreground lg:text-base">What&apos;s happening at the ridge?</span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-primary">
            <ImagePlus className="size-[18px]" aria-hidden />
          </span>
        </motion.button>
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.35 }}
          className={cn(FEED_COLUMN_CLASS, "space-y-4 pb-2")}
        >
          {demoFeedPosts.map((post) => (
            <FeedPostCard key={post.id} post={post} />
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
