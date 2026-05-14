"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, MessageCircle, Play, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { DemoFeedPost } from "@/lib/social-demo";
import { cn } from "@/lib/utils";

const categoryLabel: Record<DemoFeedPost["category"], string> = {
  memory: "Memory",
  update: "Update",
  event: "Event",
  wildlife: "Wildlife",
  project: "Project",
  weekend_recap: "Weekend recap",
};

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

export function FeedPostCard({ post }: { post: DemoFeedPost }) {
  const reduceMotion = useReducedMotion();
  const [reactionState, setReactionState] = useState(() =>
    Object.fromEntries(post.reactions.map((r) => [r.emoji, { count: r.count, on: !!r.active }]))
  );

  const toggleReaction = useCallback((emoji: string) => {
    setReactionState((prev) => {
      const cur = prev[emoji] ?? { count: 0, on: false };
      const on = !cur.on;
      return { ...prev, [emoji]: { count: cur.count + (on ? 1 : -1), on } };
    });
  }, []);

  const mediaHeight =
    post.layout === "hero" ? "min-h-[220px] sm:min-h-[280px]" : post.layout === "tall" ? "min-h-[260px]" : "min-h-[200px]";

  return (
    <motion.article
      layout={false}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: reduceMotion ? 0.2 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      className="touch-manipulation"
    >
      <div
        className={cn(
          surface,
          "transition-[box-shadow,border-color,transform] duration-300 will-change-transform",
          "hover:border-white/16 hover:shadow-[0_34px_90px_-40px_rgba(0,0,0,0.82)]"
        )}
      >
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar size="lg" className="ring-2 ring-background/80">
              <AvatarImage src={post.author.avatar} alt="" />
              <AvatarFallback>{initials(post.author.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{post.author.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>{post.timeLabel}</span>
                <span className="opacity-40">·</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-medium text-muted-foreground">
                  {categoryLabel[post.category]}
                </span>
              </div>
            </div>
          </div>
          <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">
            Private
          </span>
        </div>

        {post.title && (
          <div className="px-4 sm:px-5">
            <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">{post.title}</h3>
          </div>
        )}

        {post.location && (
          <div className="mt-2 flex items-center gap-1.5 px-4 text-xs text-muted-foreground sm:px-5">
            <MapPin className="size-3.5 shrink-0 text-primary/80" aria-hidden />
            <span className="truncate">{post.location}</span>
          </div>
        )}

        <div className={cn("mt-4 px-4 sm:px-5", post.kind === "text" ? "pb-2" : "")}>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{post.body}</p>
        </div>

        {post.linkedEvent && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary-foreground/90 sm:mx-5">
            <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="font-medium">{post.linkedEvent}</span>
          </div>
        )}

        {post.kind === "image" && post.cover && (
          <div className={cn("relative mt-4 overflow-hidden border-y border-white/10", mediaHeight)}>
            <Image
              src={post.cover}
              alt=""
              fill
              sizes="(min-width: 1280px) 560px, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
              loading="lazy"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/55 via-transparent to-transparent" />
          </div>
        )}

        {post.kind === "album" && post.album && post.album.length > 0 && (
          <div className="mt-4 space-y-2 px-4 sm:px-5">
            <div
              className={cn(
                "grid gap-2",
                post.album.length >= 3 ? "grid-cols-3" : post.album.length === 2 ? "grid-cols-2" : "grid-cols-1"
              )}
            >
              {post.album.map((src, i) => (
                <div
                  key={src}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border border-white/10",
                    post.layout === "tall" && i === 0 ? "aspect-[16/11] sm:aspect-[5/3]" : "aspect-[4/3]"
                  )}
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="200px" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}

        {post.kind === "video" && post.video && (
          <div className={cn("relative mt-4 overflow-hidden border-y border-white/10", mediaHeight)}>
            <Image
              src={post.video.poster}
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1280px) 560px, 100vw"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-background/25 backdrop-blur-[2px]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span
                className="flex size-14 items-center justify-center rounded-full border border-white/20 bg-background/55 text-foreground shadow-lg backdrop-blur-md"
                whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              >
                <Play className="size-6 translate-x-0.5" aria-hidden />
              </motion.span>
            </div>
            <span className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-background/60 px-2 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur-md">
              {post.video.duration}
            </span>
          </div>
        )}

        {post.kind === "event_recap" && post.cover && (
          <div className={cn("relative mt-4 overflow-hidden border-y border-white/10", mediaHeight)}>
            <Image src={post.cover} alt="" fill className="object-cover" sizes="(min-width: 1280px) 560px, 100vw" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-tr from-background/70 via-transparent to-primary/10" />
            <div className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-background/55 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur-md">
              Event recap
            </div>
          </div>
        )}

        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            {post.reactions.map((r) => {
              const state = reactionState[r.emoji] ?? { count: r.count, on: false };
              return (
                <motion.button
                  key={r.emoji}
                  type="button"
                  onClick={() => toggleReaction(r.emoji)}
                  whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    state.on
                      ? "border-primary/40 bg-primary/15 text-foreground"
                      : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/18 hover:text-foreground"
                  )}
                >
                  <motion.span
                    key={`${r.emoji}-${state.on}`}
                    initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                    className="text-[15px]"
                  >
                    {r.emoji}
                  </motion.span>
                  <span className="tabular-nums text-[11px]">{Math.max(0, state.count)}</span>
                </motion.button>
              );
            })}
          </div>

          <Separator className="bg-white/10" />

          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="size-3.5" aria-hidden />
              <span>{post.commentCount} comments</span>
            </span>
            <span className="hidden sm:inline">Tap reactions · long-press not needed</span>
          </div>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            {post.commentsPreview.map((c) => (
              <p key={`${c.author}-${c.text}`} className="text-[13px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{c.author}</span>{" "}
                <span>{c.text}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
