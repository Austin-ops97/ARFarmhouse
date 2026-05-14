"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bookmark,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Play,
  Send,
  Sparkles,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DemoFeedPost } from "@/lib/social-demo";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-2xl border border-white/10",
  "bg-white/[0.035] shadow-[0_20px_50px_-28px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:rounded-[1.15rem]"
);

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

function useAlbumIndex(length: number) {
  const [i, setI] = useState(0);
  const next = useCallback(() => setI((v) => (v + 1) % length), [length]);
  const prev = useCallback(() => setI((v) => (v - 1 + length) % length), [length]);
  return { i, next, prev, setI };
}

export function FeedPostCard({ post }: { post: DemoFeedPost }) {
  const reduceMotion = useReducedMotion();
  const [reactionState, setReactionState] = useState(() =>
    Object.fromEntries(post.reactions.map((r) => [r.emoji, { count: r.count, on: !!r.active }]))
  );

  const album = post.album ?? [];
  const albumNav = useAlbumIndex(Math.max(album.length, 1));

  const toggleReaction = useCallback((emoji: string) => {
    setReactionState((prev) => {
      const cur = prev[emoji] ?? { count: 0, on: false };
      const on = !cur.on;
      return { ...prev, [emoji]: { count: cur.count + (on ? 1 : -1), on } };
    });
  }, []);

  const totalEngagement = useMemo(
    () => Object.values(reactionState).reduce((acc, r) => acc + r.count, 0),
    [reactionState]
  );

  const primaryKey = post.reactions[0]?.emoji ?? "❤️";
  const heartActive = reactionState[primaryKey]?.on ?? false;
  const hasMedia =
    (post.kind === "image" && post.cover) ||
    (post.kind === "album" && album.length > 0) ||
    (post.kind === "video" && post.video) ||
    (post.kind === "event_recap" && post.cover);

  const mediaAspect = post.layout === "hero" ? "aspect-[4/5] sm:aspect-[1/1] sm:max-h-[min(72vh,560px)]" : "aspect-[4/5]";

  return (
    <motion.article
      layout={false}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5% 0px" }}
      transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="touch-manipulation"
    >
      <div
        className={cn(
          surface,
          "transition-[box-shadow,border-color] duration-300",
          "hover:border-white/14 hover:shadow-[0_28px_70px_-36px_rgba(0,0,0,0.78)]"
        )}
      >
        {/* Header — IG / FB style */}
        <div className="flex items-center gap-3 px-3 py-2.5 sm:px-3.5">
          <Avatar size="default" className="ring-2 ring-background/80">
            <AvatarImage src={post.author.avatar} alt="" />
            <AvatarFallback>{initials(post.author.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{post.author.name}</p>
            {post.location && (
              <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                <MapPin className="size-3 shrink-0 opacity-70" aria-hidden />
                <span>{post.location}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            aria-label="Post options"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </div>

        {/* Media first — full bleed inside card */}
        {post.kind === "image" && post.cover && (
          <div className={cn("relative w-full bg-black/25", mediaAspect)}>
            <Image
              src={post.cover}
              alt=""
              fill
              sizes="470px"
              className="object-cover"
              loading="lazy"
            />
          </div>
        )}

        {post.kind === "album" && album.length > 0 && (
          <div className="relative w-full bg-black/25">
            <div className={cn("relative w-full", mediaAspect)}>
              <Image
                src={album[albumNav.i] ?? album[0]}
                alt=""
                fill
                className="object-cover"
                sizes="470px"
                loading="lazy"
              />
            </div>
            {album.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={albumNav.prev}
                  className="absolute top-1/2 left-1.5 z-10 -translate-y-1/2 rounded-full bg-background/55 p-1.5 text-foreground backdrop-blur-md"
                >
                  <span className="sr-only">Previous</span>
                  <span className="text-xs font-bold">‹</span>
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={albumNav.next}
                  className="absolute top-1/2 right-1.5 z-10 -translate-y-1/2 rounded-full bg-background/55 p-1.5 text-foreground backdrop-blur-md"
                >
                  <span className="sr-only">Next</span>
                  <span className="text-xs font-bold">›</span>
                </button>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {album.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Photo ${idx + 1}`}
                      onClick={() => albumNav.setI(idx)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        idx === albumNav.i ? "w-5 bg-primary" : "w-1.5 bg-white/35"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {post.kind === "video" && post.video && (
          <div className={cn("relative w-full bg-black/30", mediaAspect)}>
            <Image
              src={post.video.poster}
              alt=""
              fill
              className="object-cover"
              sizes="470px"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <motion.span
                className="flex size-16 items-center justify-center rounded-full border border-white/25 bg-background/45 text-foreground shadow-lg backdrop-blur-md"
                whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              >
                <Play className="size-7 translate-x-0.5" aria-hidden />
              </motion.span>
            </div>
            <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[11px] font-medium text-white">
              {post.video.duration}
            </span>
          </div>
        )}

        {post.kind === "event_recap" && post.cover && (
          <div className={cn("relative w-full bg-black/25", mediaAspect)}>
            <Image src={post.cover} alt="" fill className="object-cover" sizes="470px" loading="lazy" />
            <div className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
              Event recap
            </div>
          </div>
        )}

        {post.kind === "text" && !hasMedia && (
          <div className="border-y border-white/[0.06] bg-white/[0.02] px-3 py-4 sm:px-3.5">
            <p className="text-[15px] leading-relaxed text-foreground">{post.body}</p>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-1 px-1.5 pt-2 sm:px-2">
          <motion.button
            type="button"
            aria-label={heartActive ? "Unlike" : "Like"}
            onClick={() => toggleReaction(primaryKey)}
            whileTap={reduceMotion ? undefined : { scale: 0.88 }}
            className={cn(
              "rounded-full p-2 text-foreground transition-colors hover:bg-white/[0.06]",
              heartActive && "text-red-400"
            )}
          >
            <Heart className={cn("size-6", heartActive && "fill-current")} strokeWidth={1.75} />
          </motion.button>
          <button
            type="button"
            className="rounded-full p-2 text-foreground transition-colors hover:bg-white/[0.06]"
            aria-label="Comment"
          >
            <MessageCircle className="size-6" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-foreground transition-colors hover:bg-white/[0.06]"
            aria-label="Share"
          >
            <Send className="size-6" strokeWidth={1.75} />
          </button>
          <span className="flex-1" />
          <button
            type="button"
            className="rounded-full p-2 text-foreground transition-colors hover:bg-white/[0.06]"
            aria-label="Save"
          >
            <Bookmark className="size-6" strokeWidth={1.75} />
          </button>
        </div>

        {/* Reactions row (IG-adjacent: emoji + counts) */}
        <div className="flex flex-wrap gap-1.5 px-3 pb-1 pt-0.5 sm:px-3.5">
          {post.reactions.map((r) => {
            const state = reactionState[r.emoji] ?? { count: r.count, on: false };
            return (
              <motion.button
                key={r.emoji}
                type="button"
                onClick={() => toggleReaction(r.emoji)}
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] transition-colors",
                  state.on ? "bg-white/[0.1]" : "hover:bg-white/[0.06]"
                )}
              >
                <span>{r.emoji}</span>
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{state.count}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Likes / engagement summary */}
        {totalEngagement > 0 && (
          <p className="px-3 pb-1 text-sm font-semibold text-foreground sm:px-3.5">
            {totalEngagement.toLocaleString()} {totalEngagement === 1 ? "reaction" : "reactions"}
          </p>
        )}

        {/* Caption — username + copy (FB/IG) */}
        {post.kind !== "text" && (
          <div className="space-y-1.5 px-3 pb-2 sm:px-3.5">
            {post.title && <p className="text-sm font-semibold text-foreground">{post.title}</p>}
            <p className="text-sm leading-relaxed text-foreground">
              <span className="font-semibold">{post.author.name.split(" ")[0]} </span>
              <span className="font-normal text-foreground/90">{post.body}</span>
            </p>
          </div>
        )}

        {post.linkedEvent && (
          <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs text-primary-foreground/95 sm:mx-3.5">
            <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="font-medium">{post.linkedEvent}</span>
          </div>
        )}

        <button
          type="button"
          className="px-3 pb-1 text-left text-sm font-medium text-muted-foreground hover:text-foreground sm:px-3.5"
        >
          View all {post.commentCount} comments
        </button>

        <div className="space-y-1.5 px-3 pb-2 sm:px-3.5">
          {post.commentsPreview.map((c) => (
            <p key={`${c.author}-${c.text}`} className="text-sm leading-snug">
              <span className="font-semibold text-foreground">{c.author}</span>{" "}
              <span className="text-foreground/85">{c.text}</span>
            </p>
          ))}
        </div>

        <p className="px-3 pb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:px-3.5">
          {post.timeLabel}
        </p>
      </div>
    </motion.article>
  );
}
