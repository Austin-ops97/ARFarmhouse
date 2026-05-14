"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Bookmark, MapPin, Navigation, Phone, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LocalGuideRow } from "@/lib/local-guide-types";
import { familyRecommendations, isVerifiedRow } from "@/lib/local-guide";
import { cn } from "@/lib/utils";

type LocalGuideBusinessCardProps = {
  place: LocalGuideRow;
  saved: boolean;
  onToggleSave: () => void;
  onOpen: () => void;
  onCall: () => void;
  onDirections: () => void;
};

export function LocalGuideBusinessCard({
  place,
  saved,
  onToggleSave,
  onOpen,
  onCall,
  onDirections,
}: LocalGuideBusinessCardProps) {
  const reduceMotion = useReducedMotion();
  const verified = isVerifiedRow(place);
  const tip = familyRecommendations[place.key];

  return (
    <motion.article
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      className={cn(
        "group/card overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.035] shadow-[0_20px_60px_-36px_rgba(0,0,0,0.78)] backdrop-blur-xl",
        "touch-manipulation"
      )}
    >
      <button type="button" onClick={onOpen} className="relative block w-full text-left">
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Image
            src={place.imageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 420px"
            className="object-cover transition duration-500 group-hover/card:scale-[1.03]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-100/95 backdrop-blur-md">
                <ShieldCheck className="size-3" aria-hidden />
                Verified
              </span>
            )}
            {!verified && (
              <span className="rounded-full border border-white/15 bg-background/55 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-md">
                Call ahead
              </span>
            )}
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="font-heading text-lg font-semibold tracking-tight text-foreground drop-shadow-sm sm:text-xl">
              {place.business}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{place.category}</p>
          </div>
        </div>
      </button>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3 shrink-0 text-primary/80" aria-hidden />
            <span className={cn(!place.address && "italic opacity-70")}>
              {place.address || "Address not on file — confirm before navigating"}
            </span>
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span>{place.distanceMi} mi · AR Farmhouse</span>
        </div>

        {tip && (
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.07] px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-primary/90">
              <Sparkles className="size-3" aria-hidden />
              Family note
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground/95">{tip}</p>
          </div>
        )}

        <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{place.notes}</p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={!place.phone}
            onClick={(e) => {
              e.stopPropagation();
              onCall();
            }}
          >
            <Phone className="size-3.5" data-icon="inline-start" />
            Call
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={(e) => {
              e.stopPropagation();
              onDirections();
            }}
          >
            <Navigation className="size-3.5" data-icon="inline-start" />
            Maps
          </Button>
          <Button
            type="button"
            size="sm"
            variant={saved ? "default" : "outline"}
            className="rounded-xl"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }}
          >
            <Bookmark className={cn("size-3.5", saved && "fill-current")} data-icon="inline-start" />
            {saved ? "Saved" : "Save"}
          </Button>
          <Button type="button" size="sm" className="ml-auto rounded-xl" onClick={onOpen}>
            Details
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
