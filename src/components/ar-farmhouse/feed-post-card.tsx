"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bookmark,
  ChevronDown,
  Heart,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Play,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { DemoFeedPost } from "@/lib/social-demo";
import { FEED_IMAGE_SIZES, FEED_MEDIA_BLEED } from "@/lib/feed-layout";
import { hubSlugFromLinkedEventLabel } from "@/lib/ecosystem-demo";
import { cn } from "@/lib/utils";

const categoryLabel: Record<DemoFeedPost["category"], string> = {
  memory: "Memory",
  update: "Update",
  event: "Event",
  wildlife: "Wildlife",
  project: "Project",
  weekend_recap: "Weekend",
};

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

type LightboxState = { urls: string[]; index: number } | null;

function FeedLightbox({
  state,
  onClose,
  onPrev,
  onNext,
  reduceMotion,
}: {
  state: LightboxState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  reduceMotion: boolean | null;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose, onPrev, onNext]);

  if (!mounted) return null;

  const activeSrc = state?.urls[state.index];

  return createPortal(
    <AnimatePresence>
      {state && activeSrc ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          key="feed-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.22 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/88 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md sm:p-4"
          onClick={onClose}
        >
          <button
            type="button"
            className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 rounded-full border border-white/15 bg-white/10 p-2.5 text-white hover:bg-white/20 sm:right-4 sm:top-4"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
          {state.urls.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-lg text-white hover:bg-white/20 sm:left-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-lg text-white hover:bg-white/20 sm:right-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                aria-label="Next"
              >
                ›
              </button>
            </>
          )}
          <motion.div
            key={activeSrc}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-[min(90dvh,900px)] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/5] w-full sm:aspect-auto sm:max-h-[85vh] sm:min-h-[320px]">
              <Image src={activeSrc} alt="" fill className="object-contain" sizes="(max-width: 768px) 100vw, 1200px" priority />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

export function FeedPostCard({ post }: { post: DemoFeedPost }) {
  const reduceMotion = useReducedMotion();
  const { openWeekendHub } = useEcosystem();
  const [reactionState, setReactionState] = useState(() =>
    Object.fromEntries(post.reactions.map((r) => [r.emoji, { count: r.count, on: !!r.active }]))
  );
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const touchStart = useRef({ x: 0, y: 0 });

  const albumNav = useAlbumIndex(Math.max((post.album ?? []).length, 1));

  const albumUrls = useMemo(() => {
    const album = post.album ?? [];
    if (post.kind === "image" && post.cover) return [post.cover];
    if (post.kind === "album" && album.length) return album;
    if (post.kind === "video" && post.video) return [post.video.poster];
    if (post.kind === "event_recap" && post.cover) return [post.cover];
    return [];
  }, [post]);

  const album = post.album ?? [];

  const openLightboxAt = (index: number) => {
    if (!albumUrls.length) return;
    setLightbox({ urls: albumUrls, index: Math.min(index, albumUrls.length - 1) });
  };

  const lightboxPrev = () =>
    setLightbox((s) => {
      if (!s) return s;
      const n = (s.index - 1 + s.urls.length) % s.urls.length;
      return { ...s, index: n };
    });

  const lightboxNext = () =>
    setLightbox((s) => {
      if (!s) return s;
      const n = (s.index + 1) % s.urls.length;
      return { ...s, index: n };
    });

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

  const primaryKey = post.reactions.find((r) => r.emoji === "❤️")?.emoji ?? post.reactions[0]?.emoji ?? "❤️";
  const heartActive = reactionState[primaryKey]?.on ?? false;
  const hasMedia =
    (post.kind === "image" && post.cover) ||
    (post.kind === "album" && album.length > 0) ||
    (post.kind === "video" && post.video) ||
    (post.kind === "event_recap" && post.cover);

  const mediaShell = cn(
    "relative overflow-hidden bg-zinc-950/40",
    FEED_MEDIA_BLEED,
    "rounded-none sm:rounded-[1.35rem]",
    "ring-1 ring-inset ring-white/[0.06]",
    "shadow-[0_24px_80px_-40px_rgba(0,0,0,0.85)]"
  );

  const onAlbumTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    if (Math.abs(dx) < 52 || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) albumNav.next();
    else albumNav.prev();
  };

  return (
    <>
      <motion.article
        layout={false}
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-4% 0px" }}
        transition={{ duration: reduceMotion ? 0.2 : 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="touch-manipulation pb-10 sm:pb-12"
      >
        <header className="flex items-start gap-3 px-1 pb-3 sm:px-0">
          <Avatar size="lg" className="ring-2 ring-white/10">
            <AvatarImage src={post.author.avatar} alt="" />
            <AvatarFallback>{initials(post.author.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[15px] font-semibold tracking-tight text-foreground">{post.author.name}</span>
              <span className="text-[13px] text-muted-foreground">{post.timeLabel}</span>
              <span className="text-[11px] font-medium text-primary/90">· {categoryLabel[post.category]}</span>
            </div>
            {post.location && (
              <p className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground">
                <MapPin className="size-3 shrink-0 opacity-70" aria-hidden />
                <span>{post.location}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
            aria-label="Post options"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </header>

        {/* Media — dominant, immersive */}
        {post.kind === "image" && post.cover && (
          <button type="button" className={cn("group/media block w-full text-left", mediaShell)} onClick={() => openLightboxAt(0)}>
            <div className="relative aspect-[4/5] max-h-[min(88vh,720px)] w-full sm:aspect-[4/5] sm:max-h-[min(82vh,680px)]">
              <motion.div
                className="relative h-full w-full"
                whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image src={post.cover} alt="" fill sizes={FEED_IMAGE_SIZES} className="object-cover" loading="lazy" />
              </motion.div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent opacity-80 sm:opacity-100" />
            </div>
          </button>
        )}

        {post.kind === "album" && album.length > 0 && (
          <div className={mediaShell}>
            {/* Mobile: swipe carousel */}
            <div
              className="relative sm:hidden"
              onTouchStart={(e) => {
                touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
              }}
              onTouchEnd={onAlbumTouchEnd}
            >
              <div className="relative aspect-[4/5] max-h-[min(88vh,720px)] w-full">
                <motion.div
                  key={albumNav.i}
                  initial={reduceMotion ? false : { opacity: 0.85 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="relative h-full w-full"
                >
                  <button type="button" className="relative block h-full w-full" onClick={() => openLightboxAt(albumNav.i)}>
                    <Image
                      src={album[albumNav.i] ?? album[0]}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="100vw"
                      loading="lazy"
                    />
                  </button>
                </motion.div>
              </div>
              {album.length > 1 && (
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {album.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Photo ${idx + 1}`}
                      onClick={() => albumNav.setI(idx)}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        idx === albumNav.i ? "w-6 bg-primary" : "w-1.5 bg-white/40"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Desktop: IG-style grid */}
            <div className="hidden sm:block">
              {album.length === 1 && (
                <button type="button" className="relative block w-full" onClick={() => openLightboxAt(0)}>
                  <div className="relative aspect-[4/5] max-h-[min(82vh,680px)] w-full">
                    <motion.div className="relative h-full w-full" whileHover={reduceMotion ? undefined : { scale: 1.02 }} transition={{ duration: 0.45 }}>
                      <Image src={album[0]} alt="" fill className="object-cover" sizes={FEED_IMAGE_SIZES} loading="lazy" />
                    </motion.div>
                  </div>
                </button>
              )}
              {album.length === 2 && (
                <div className="grid grid-cols-2 gap-1">
                  {album.map((src, idx) => (
                    <button
                      key={src}
                      type="button"
                      className="relative aspect-[4/5] overflow-hidden first:rounded-l-[1.25rem] last:rounded-r-[1.25rem]"
                      onClick={() => openLightboxAt(idx)}
                    >
                      <motion.div className="relative h-full w-full" whileHover={reduceMotion ? undefined : { scale: 1.02 }} transition={{ duration: 0.4 }}>
                        <Image src={src} alt="" fill className="object-cover" sizes="260px" loading="lazy" />
                      </motion.div>
                    </button>
                  ))}
                </div>
              )}
              {album.length >= 3 && (
                <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-[1.25rem]">
                  {album.slice(0, 3).map((src, idx) => (
                    <button key={src} type="button" className="relative aspect-square" onClick={() => openLightboxAt(idx)}>
                      <motion.div className="relative h-full w-full" whileHover={reduceMotion ? undefined : { scale: 1.03 }} transition={{ duration: 0.35 }}>
                        <Image src={src} alt="" fill className="object-cover" sizes="180px" loading="lazy" />
                      </motion.div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {post.kind === "video" && post.video && (
          <div className={mediaShell}>
            <button type="button" className="relative block w-full" onClick={() => openLightboxAt(0)}>
              <div className="relative aspect-[4/5] max-h-[min(88vh,720px)] w-full">
                <motion.div className="relative h-full w-full" whileHover={reduceMotion ? undefined : { scale: 1.02 }} transition={{ duration: 0.45 }}>
                  <Image src={post.video.poster} alt="" fill className="object-cover" sizes={FEED_IMAGE_SIZES} loading="lazy" />
                </motion.div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <span className="flex size-16 items-center justify-center rounded-full border border-white/25 bg-background/50 text-white shadow-xl backdrop-blur-md">
                    <Play className="size-7 translate-x-0.5" aria-hidden />
                  </span>
                </div>
                <span className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
                  {post.video.duration}
                </span>
              </div>
            </button>
          </div>
        )}

        {post.kind === "event_recap" && post.cover && (
          <button type="button" className={cn("block w-full text-left", mediaShell)} onClick={() => openLightboxAt(0)}>
            <div className="relative aspect-[4/5] max-h-[min(88vh,720px)] w-full">
              <motion.div className="relative h-full w-full" whileHover={reduceMotion ? undefined : { scale: 1.02 }} transition={{ duration: 0.45 }}>
                <Image src={post.cover} alt="" fill className="object-cover" sizes={FEED_IMAGE_SIZES} loading="lazy" />
              </motion.div>
              <div className="absolute bottom-3 left-3 rounded-full border border-white/15 bg-background/55 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-md">
                Event recap
              </div>
            </div>
          </button>
        )}

        {post.kind === "text" && !hasMedia && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-5 sm:px-5 sm:py-6">
            <p className="text-[15px] leading-relaxed text-foreground/95 sm:text-base">{post.body}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 px-1 pt-3 sm:px-0 sm:pt-4">
          <motion.button
            type="button"
            aria-label={heartActive ? "Unlike" : "Like"}
            onClick={() => toggleReaction(primaryKey)}
            whileTap={reduceMotion ? undefined : { scale: 0.86 }}
            className={cn("rounded-full p-2.5 text-foreground transition-colors hover:bg-white/[0.06]", heartActive && "text-red-400")}
          >
            <Heart className={cn("size-7", heartActive && "fill-current")} strokeWidth={1.6} />
          </motion.button>
          <button type="button" className="rounded-full p-2.5 text-foreground transition-colors hover:bg-white/[0.06]" aria-label="Comment">
            <MessageCircle className="size-7" strokeWidth={1.6} />
          </button>
          <button type="button" className="rounded-full p-2.5 text-foreground transition-colors hover:bg-white/[0.06]" aria-label="Share">
            <Send className="size-7" strokeWidth={1.6} />
          </button>
          <span className="flex-1" />
          <button type="button" className="rounded-full p-2.5 text-foreground transition-colors hover:bg-white/[0.06]" aria-label="Save">
            <Bookmark className="size-7" strokeWidth={1.6} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 px-1 pt-1 sm:px-0">
          {post.reactions.map((r) => {
            const state = reactionState[r.emoji] ?? { count: r.count, on: false };
            return (
              <motion.button
                key={r.emoji}
                type="button"
                onClick={() => toggleReaction(r.emoji)}
                whileTap={reduceMotion ? undefined : { scale: 0.88 }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[14px] transition-colors",
                  state.on ? "bg-primary/15 text-foreground" : "hover:bg-white/[0.06]"
                )}
              >
                <motion.span
                  key={`${r.emoji}-${state.on}`}
                  initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                >
                  {r.emoji}
                </motion.span>
                <span className="text-[12px] font-medium tabular-nums text-muted-foreground">{Math.max(0, state.count)}</span>
              </motion.button>
            );
          })}
        </div>

        {totalEngagement > 0 && (
          <p className="px-1 pt-2 text-sm font-semibold text-foreground sm:px-0">
            {totalEngagement.toLocaleString()} {totalEngagement === 1 ? "reaction" : "reactions"}
          </p>
        )}

        {post.kind !== "text" && (
          <div className="space-y-1.5 px-1 pt-2 sm:px-0 sm:pt-3">
            {post.title && <p className="text-[15px] font-semibold leading-snug text-foreground">{post.title}</p>}
            <p className="text-[15px] leading-relaxed text-foreground/90 sm:text-base">
              <span className="font-semibold text-foreground">{post.author.name.split(" ")[0]} </span>
              {post.body}
            </p>
          </div>
        )}

        {post.linkedEvent && (
          <button
            type="button"
            onClick={() => {
              const slug = hubSlugFromLinkedEventLabel(post.linkedEvent!);
              if (slug) openWeekendHub(slug);
            }}
            className="mx-1 mt-3 flex w-full items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.09] px-3 py-2 text-left text-xs text-primary-foreground/95 transition-colors hover:border-primary/35 hover:bg-primary/[0.12] sm:mx-0"
          >
            <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
            <span className="font-medium">{post.linkedEvent}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">Open hub</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setCommentsOpen((v) => !v)}
          className="mt-2 flex w-full items-center justify-between gap-2 px-1 py-1 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-0"
        >
          <span>
            {commentsOpen ? "Hide" : "View"} {post.commentCount} comments
          </span>
          <motion.span animate={{ rotate: commentsOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {commentsOpen && (
            <motion.div
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-2 border-l border-primary/25 py-2 pl-3 sm:pl-4">
                {post.commentsPreview.map((c) => (
                  <p key={`${c.author}-${c.text}`} className="text-[14px] leading-relaxed text-foreground/90">
                    <span className="font-semibold text-foreground">{c.author}</span> {c.text}
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.article>

      <FeedLightbox
        state={lightbox}
        onClose={() => setLightbox(null)}
        onPrev={lightboxPrev}
        onNext={lightboxNext}
        reduceMotion={reduceMotion}
      />
    </>
  );
}
