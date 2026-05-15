"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, MessageSquare, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Button } from "@/components/ui/button";
import { albumBucketLabel, type AlbumMediaItem } from "@/lib/photo-album-media";
import { cn } from "@/lib/utils";

type PhotoAlbumLightboxProps = {
  open: boolean;
  items: AlbumMediaItem[];
  initialIndex: number;
  onClose: () => void;
};

export function PhotoAlbumLightbox({ open, items, initialIndex, onClose }: PhotoAlbumLightboxProps) {
  const reduceMotion = useReducedMotion();
  const { goTo } = useEcosystem();
  const router = useRouter();
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- align viewer with lightbox open target
    setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1)));
  }, [open, initialIndex, items.length]);

  const current = items[index];

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => {
        const n = i + dir;
        if (n < 0) return items.length - 1;
        if (n >= items.length) return 0;
        return n;
      });
    },
    [items.length]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, go]);

  if (!current || items.length === 0) return null;

  const metaParts = [
    current.authorName,
    current.timeLabel,
    current.linkedEvent,
    current.source === "upload" ? albumBucketLabel(current.albumKey) : "From feed",
  ].filter(Boolean);

  const openFeedPost = () => {
    if (!current.postId) return;
    onClose();
    goTo("feed");
    router.replace(`/?post=${encodeURIComponent(current.postId)}`);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col bg-background/92 backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.28 }}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-sm font-semibold tracking-tight text-foreground">
                {current.postTitle ?? (current.source === "upload" ? albumBucketLabel(current.albumKey) : "Memory")}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">{metaParts.join(" · ")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/80 bg-card/60 text-foreground shadow-sm transition hover:bg-muted/80"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </header>

          <div className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 z-10 hidden size-11 items-center justify-center rounded-full border border-border/70 bg-card/55 text-foreground shadow-md backdrop-blur-md transition hover:bg-muted/80 sm:flex"
              aria-label="Previous"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 z-10 hidden size-11 items-center justify-center rounded-full border border-border/70 bg-card/55 text-foreground shadow-md backdrop-blur-md transition hover:bg-muted/80 sm:flex"
              aria-label="Next"
            >
              <ChevronRight className="size-6" />
            </button>

            <motion.div
              key={current.id}
              drag={reduceMotion ? false : "x"}
              dragElastic={0.12}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (reduceMotion) return;
                if (info.offset.x < -72) go(1);
                else if (info.offset.x > 72) go(-1);
              }}
              initial={reduceMotion ? false : { opacity: 0.88, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full max-w-[min(96vw,1240px)] flex-1 items-center justify-center px-1 sm:px-3"
            >
              {/* No fixed aspect-ratio wrapper — scale to viewport while preserving natural proportions */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.src}
                alt=""
                width={current.width}
                height={current.height}
                decoding="async"
                draggable={false}
                className={cn(
                  "max-h-[min(calc(100dvh-11rem),900px)] max-w-full rounded-[min(18px,_4vw)] object-contain shadow-[0_38px_110px_-46px_rgba(0,0,0,0.52)] ring-1 ring-border/35 sm:max-h-[min(calc(100dvh-12rem),920px)]",
                  "dark:shadow-[0_44px_120px_-42px_rgba(0,0,0,0.72)] dark:ring-white/[0.08]",
                  "h-auto w-auto"
                )}
              />
            </motion.div>
          </div>

          <footer className="shrink-0 space-y-3 border-t border-border/50 bg-card/30 px-4 py-3 backdrop-blur-xl">
            <p className="line-clamp-3 text-center text-[13px] leading-relaxed text-muted-foreground">{current.caption}</p>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <p className="text-center text-[10px] tabular-nums text-muted-foreground/75">
                {index + 1} / {items.length}
              </p>
              {current.postId ? (
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={openFeedPost}>
                  <MessageSquare className="opacity-80" data-icon="inline-start" aria-hidden />
                  View original post
                </Button>
              ) : null}
            </div>
          </footer>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
