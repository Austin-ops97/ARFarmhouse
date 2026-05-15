"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Images } from "lucide-react";
import { useMemo } from "react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { usePhotoAlbum } from "@/contexts/photo-album-context";
import { memoriesForWeekendHub } from "@/lib/photo-album-media";
import { cn } from "@/lib/utils";

type WeekendHubAlbumStripProps = {
  eventTitle: string;
};

export function WeekendHubAlbumStrip({ eventTitle }: WeekendHubAlbumStripProps) {
  const reduceMotion = useReducedMotion();
  const { goTo } = useEcosystem();
  const { allItems, openLightbox } = usePhotoAlbum();
  const picks = useMemo(() => memoriesForWeekendHub(eventTitle, allItems).slice(0, 5), [eventTitle, allItems]);

  if (picks.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-4 rounded-2xl border border-border/50 bg-muted/20 p-4 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.03]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <Images className="size-3.5 text-primary" aria-hidden />
          Visual memories
        </p>
        <button
          type="button"
          onClick={() => {
            goTo("album");
          }}
          className="text-[11px] font-medium text-primary transition hover:text-primary/85"
        >
          Album
        </button>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {picks.map((item, idx) => (
          <motion.button
            key={item.id}
            type="button"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: reduceMotion ? 0 : idx * 0.05 }}
            onClick={() => openLightbox({ items: picks, index: idx })}
            className="relative flex h-20 max-w-[min(42vw,200px)] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/30 px-1 ring-1 ring-border/40 dark:bg-zinc-950/70 dark:ring-white/[0.06]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt=""
              width={item.width}
              height={item.height}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="max-h-full w-auto max-w-full object-contain"
            />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
