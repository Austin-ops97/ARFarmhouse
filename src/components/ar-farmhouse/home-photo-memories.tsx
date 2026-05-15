"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Images } from "lucide-react";
import { useMemo } from "react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { usePhotoAlbum } from "@/contexts/photo-album-context";
import { shelfItems } from "@/lib/photo-album-media";
import { cn } from "@/lib/utils";

export function HomePhotoMemories() {
  const reduceMotion = useReducedMotion();
  const { goTo } = useEcosystem();
  const { allItems, openLightbox } = usePhotoAlbum();

  const lastWeekend = useMemo(() => shelfItems("this_weekend", allItems).slice(0, 4), [allItems]);
  const recent = useMemo(() => shelfItems("recent", allItems).slice(0, 5), [allItems]);

  return (
    <section className="relative">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">Photo album</p>
          <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Recent memories</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Pulled from the feed and your uploads — the same river, arranged for stillness.
          </p>
        </div>
        <button
          type="button"
          onClick={() => goTo("album")}
          className="group inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:text-primary/85"
        >
          Open album
          <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </button>
      </div>

      <div
        className={cn(
          "mt-8 rounded-[1.5rem] border border-border/50 bg-card/40 p-4 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5",
          "dark:border-white/[0.07] dark:bg-white/[0.03] dark:shadow-[0_28px_80px_-48px_rgba(0,0,0,0.72)]"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Images className="size-3.5 text-primary" aria-hidden />
            Last weekend · feed bridge
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(lastWeekend.length ? lastWeekend : recent).map((item, idx) => (
            <motion.button
              key={item.id}
              type="button"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-4%" }}
              transition={{ delay: reduceMotion ? 0 : idx * 0.04 }}
              onClick={() => {
                const list = lastWeekend.length ? lastWeekend : recent;
                openLightbox({ items: list, index: idx });
              }}
              className="group relative h-32 w-44 shrink-0 overflow-hidden rounded-xl ring-1 ring-border/45 sm:h-36 sm:w-52 dark:ring-white/[0.06]"
            >
              <Image
                src={item.src}
                alt=""
                fill
                className="object-cover transition duration-700 group-hover:scale-[1.06]"
                sizes="208px"
                loading="lazy"
                unoptimized={item.src.startsWith("data:")}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/88 via-transparent to-transparent" />
              <p className="absolute bottom-2 left-2 right-2 line-clamp-2 text-left text-[11px] font-medium leading-snug text-foreground">
                {item.postTitle ?? "Memory"}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
