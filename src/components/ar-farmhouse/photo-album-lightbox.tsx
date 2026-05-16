"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, MessageSquare, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { isAdmin } from "@/lib/permissions";
import { albumBucketLabel, type AlbumMediaItem } from "@/lib/photo-album-media";
import { deleteAlbumMediaItem } from "@/services/album-media";
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
  const { user, profile } = useAuth();
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const pinchLastDist = useRef(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1)));
  }, [open, initialIndex, items.length]);

  useEffect(() => {
    setScale(1);
    pinchLastDist.current = 0;
  }, [index, open]);

  const current = items[index];

  const go = useCallback(
    (dir: -1 | 1) => {
      if (scale > 1.05) return;
      setIndex((i) => {
        const n = i + dir;
        if (n < 0) return items.length - 1;
        if (n >= items.length) return 0;
        return n;
      });
    },
    [items.length, scale]
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

  useEffect(() => {
    if (!open) return;
    const el = wheelRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setScale((s) => Math.min(4, Math.max(1, s - e.deltaY * 0.009)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, index]);

  const onPinchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      pinchLastDist.current = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }
  };

  const onPinchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2 || pinchLastDist.current <= 0) return;
    const [a, b] = [e.touches[0]!, e.touches[1]!];
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const ratio = d / pinchLastDist.current;
    pinchLastDist.current = d;
    setScale((s) => Math.min(4, Math.max(1, s * ratio)));
  };

  const onPinchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchLastDist.current = 0;
  };

  const handleDelete = async () => {
    if (!user || !current || current.source !== "upload" || !current.storagePath) return;
    const authorId = current.uploadedBy ?? "";
    const allowed = authorId === user.uid || isAdmin(profile);
    if (!allowed) return;
    if (!window.confirm("Remove this photo from the family album?")) return;
    setDeleting(true);
    try {
      await deleteAlbumMediaItem(current.id, user.uid, authorId, current.storagePath, profile);
      onClose();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not delete photo.");
    } finally {
      setDeleting(false);
    }
  };

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

  const showDelete =
    Boolean(user) &&
    current.source === "upload" &&
    Boolean(current.storagePath) &&
    (current.uploadedBy === user!.uid || isAdmin(profile));

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col bg-black/94 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.28 }}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-sm font-semibold tracking-tight text-white">
                {current.postTitle ?? (current.source === "upload" ? albumBucketLabel(current.albumKey) : "Memory")}
              </p>
              <p className="truncate text-[11px] text-white/65">{metaParts.join(" · ")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white shadow-sm transition hover:bg-white/18"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </header>

          <motion.div
            drag={reduceMotion || scale > 1.05 ? false : "y"}
            dragElastic={{ top: 0, bottom: 0.45 }}
            dragConstraints={{ top: 0, bottom: 120 }}
            onDragEnd={(_, info) => {
              if (scale > 1.05) return;
              if (info.offset.y > 52 || info.velocity.y > 380) onClose();
            }}
            className="flex shrink-0 justify-center pt-1 pb-2 touch-none"
          >
            <div className="h-1 w-11 rounded-full bg-white/35" aria-hidden />
          </motion.div>

          <div
            ref={wheelRef}
            className="relative flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 z-10 hidden size-11 items-center justify-center rounded-full border border-white/22 bg-black/35 text-white shadow-md backdrop-blur-md transition hover:bg-black/50 sm:flex"
              aria-label="Previous"
              disabled={scale > 1.05}
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 z-10 hidden size-11 items-center justify-center rounded-full border border-white/22 bg-black/35 text-white shadow-md backdrop-blur-md transition hover:bg-black/50 sm:flex"
              aria-label="Next"
              disabled={scale > 1.05}
            >
              <ChevronRight className="size-6" />
            </button>

            <motion.div
              key={current.id}
              drag={reduceMotion || scale > 1.05 ? false : "x"}
              dragElastic={0.12}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (reduceMotion || scale > 1.05) return;
                if (info.offset.x < -72) go(1);
                else if (info.offset.x > 72) go(-1);
              }}
              initial={reduceMotion ? false : { opacity: 0.88, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full max-w-[min(96vw,1240px)] flex-1 items-center justify-center px-1 sm:px-3"
              style={{ touchAction: scale > 1.05 ? "none" : "pan-y" }}
              onTouchStart={onPinchStart}
              onTouchMove={onPinchMove}
              onTouchEnd={onPinchEnd}
              onTouchCancel={onPinchEnd}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.fullSrc ?? current.src}
                alt=""
                width={current.width}
                height={current.height}
                decoding="async"
                draggable={false}
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "center center",
                }}
                className={cn(
                  "max-h-[min(calc(100dvh-11rem),900px)] max-w-full rounded-[min(18px,_4vw)] object-contain shadow-[0_38px_110px_-46px_rgba(0,0,0,0.62)] ring-1 ring-white/15 sm:max-h-[min(calc(100dvh-12rem),920px)]",
                  "h-auto w-auto transition-transform duration-150 ease-out"
                )}
              />
            </motion.div>
          </div>

          <footer className="shrink-0 space-y-3 border-t border-white/12 bg-black/55 px-4 py-3 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-xl bg-white/12 text-white hover:bg-white/18"
                disabled={scale <= 1.02}
                onClick={() => setScale(1)}
              >
                Actual size
              </Button>
              {showDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="rounded-xl"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                >
                  <Trash2 className="opacity-90" data-icon="inline-start" aria-hidden />
                  {deleting ? "Removing…" : "Delete"}
                </Button>
              ) : null}
            </div>
            <p className="line-clamp-3 text-center text-[13px] leading-relaxed text-white/72">{current.caption}</p>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <p className="text-center text-[10px] tabular-nums text-white/45">
                {index + 1} / {items.length}
              </p>
              {current.postId ? (
                <Button type="button" variant="outline" size="sm" className="rounded-xl border-white/25 bg-transparent text-white hover:bg-white/12" onClick={openFeedPost}>
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
