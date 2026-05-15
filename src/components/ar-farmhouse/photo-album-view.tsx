"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Images, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { PhotoAlbumUploadDialog } from "@/components/ar-farmhouse/photo-album-upload-dialog";
import { Button } from "@/components/ui/button";
import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { usePhotoAlbum } from "@/contexts/photo-album-context";
import { type AlbumMediaItem } from "@/lib/photo-album-media";
import { cn } from "@/lib/utils";

const cardSurface = cn("ar-surface-raised rounded-[1.35rem]");

function MasonryTile({
  item,
  onOpen,
}: {
  item: AlbumMediaItem;
  onOpen: () => void;
}) {
  const title =
    item.postTitle ??
    (item.source === "upload" ? item.caption.slice(0, 48) || "Family memory" : "Untitled moment");

  const opt = item.optimisticUpload;
  const showUploadChip =
    item.optimistic && opt?.phase !== "Failed" && !opt?.error && (opt?.progress ?? 0) < 100;
  const failed = item.optimistic && (opt?.phase === "Failed" || opt?.error);

  const intrinsicRatio =
    item.width && item.height && item.width > 0 && item.height > 0 ? item.width / item.height : undefined;

  return (
    <motion.button
      type="button"
      layout
      whileHover={{ scale: 1.012 }}
      whileTap={{ scale: 0.988 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onClick={onOpen}
      style={intrinsicRatio != null ? { aspectRatio: intrinsicRatio } : undefined}
      className={cn(
        "group relative mb-3 w-full overflow-hidden rounded-2xl bg-muted/25 ring-1 ring-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        "dark:bg-zinc-950/60 dark:ring-white/[0.06]",
        intrinsicRatio == null && "min-h-[120px]"
      )}
    >
      {item.src ? (
        // eslint-disable-next-line @next/next/no-img-element -- intrinsic sizing beats Next/Image fill + fake ratios
        <img
          src={item.src}
          alt=""
          width={item.width}
          height={item.height}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn(
            "block h-auto w-full bg-muted/15 transition duration-[480ms] ease-out group-hover:scale-[1.015] dark:bg-zinc-950/35"
          )}
        />
      ) : (
        <div className="min-h-[160px] w-full animate-pulse bg-muted/50" aria-hidden />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent opacity-80 transition duration-500 group-hover:opacity-95" />
      {showUploadChip && opt ? (
        <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1.5 rounded-full border border-white/18 bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-md">
          <Loader2 className="size-3 animate-spin opacity-90" aria-hidden />
          <span className="tabular-nums">{Math.min(100, opt.progress)}%</span>
        </div>
      ) : null}
      {failed && opt?.error ? (
        <div
          role="alert"
          className="pointer-events-none absolute left-2 right-2 top-2 rounded-lg border border-red-500/35 bg-red-950/75 px-2 py-1.5 text-[10px] leading-snug text-red-50 backdrop-blur-md"
        >
          {opt.error}
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 text-left">
        <p className="line-clamp-1 font-heading text-[13px] font-semibold tracking-tight text-foreground drop-shadow-sm">
          {title}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
          {item.authorName ?? "Family"} · {item.timeLabel ?? "Album"}
        </p>
      </div>
    </motion.button>
  );
}

export function PhotoAlbumView() {
  const reduceMotion = useReducedMotion();
  const { goTo } = useEcosystem();
  const { allItems, loading, error, openLightbox } = usePhotoAlbum();
  const [uploadOpen, setUploadOpen] = useState(false);

  const openAt = (item: AlbumMediaItem, list: AlbumMediaItem[]) => {
    const idx = list.findIndex((i) => i.id === item.id);
    openLightbox({ items: list, index: Math.max(0, idx) });
  };

  const isEmpty = !loading && allItems.length === 0;

  const gridItems = useMemo(() => allItems, [allItems]);

  return (
    <div className="pb-16 pt-1 sm:pb-20">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="min-w-0 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]">
            <Images className="size-3.5 text-primary" aria-hidden />
            Family archive
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Photo Album</h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            One gallery for everything — feed moments and uploads flow together with natural proportions and fullscreen viewing.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => goTo("feed")}>
            Open feed
            <ArrowUpRight className="opacity-80" data-icon="inline-end" aria-hidden />
          </Button>
          <Button type="button" className="rounded-xl shadow-[0_16px_40px_-16px_rgba(0,0,0,0.35)]" onClick={() => setUploadOpen(true)}>
            <Plus data-icon="inline-start" aria-hidden />
            Add photos
          </Button>
        </div>
      </motion.header>

      {loading && (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
          Loading family memories…
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {isEmpty && (
        <div className="mt-12 flex flex-col items-center rounded-[1.5rem] border border-dashed border-border/60 bg-muted/20 px-8 py-14 text-center">
          <p className="font-heading text-xl font-semibold text-foreground">Family memories will appear here</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Share photos in the feed or upload your first trip photos — moments from the property will be preserved here for everyone.
          </p>
          <Button type="button" className="mt-6 rounded-xl" onClick={() => setUploadOpen(true)}>
            Upload your first trip photos
          </Button>
        </div>
      )}

      {!isEmpty && gridItems.length > 0 ? (
        <section className={cn("mt-10 p-4 sm:p-5", cardSurface)} aria-label="All memories">
          <div className="flex flex-col gap-1 border-b border-border/45 pb-4 dark:border-white/[0.06] sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Gallery</p>
              <p className="mt-1 font-heading text-lg font-semibold text-foreground sm:text-xl">All memories</p>
              <p className="mt-1 text-sm text-muted-foreground">Tap any photo for fullscreen viewing.</p>
            </div>
          </div>
          <div className="mt-6 columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
            {gridItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-6%" }}
                transition={{ delay: reduceMotion ? 0 : Math.min(idx, 24) * 0.018 }}
                className="break-inside-avoid"
              >
                <MasonryTile item={item} onOpen={() => openAt(item, gridItems)} />
              </motion.div>
            ))}
          </div>
        </section>
      ) : null}

      <PhotoAlbumUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
