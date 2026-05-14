"use client";

import Image from "next/image";
import { createElement } from "react";
import {
  Bike,
  Building2,
  Fuel,
  Heart,
  MapPin,
  Navigation,
  Phone,
  Pill,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { LocalGuideRow } from "@/lib/local-guide-types";
import { isVerifiedRow } from "@/lib/local-guide";
import { cn } from "@/lib/utils";

function storeIcon(place: LocalGuideRow): LucideIcon {
  const b = place.business.toLowerCase();
  const c = place.category.toLowerCase();
  const combo = `${b} ${c}`;
  if (combo.includes("fuel") || combo.includes("gas") || b.includes("express") || b.includes("station"))
    return Fuel;
  if (combo.includes("grocery") || combo.includes("market") || b.includes("walmart") || b.includes("harps"))
    return ShoppingBasket;
  if (combo.includes("pharmacy") || combo.includes("drug")) return Pill;
  if (combo.includes("hardware") || combo.includes("auto") || b.includes("zone") || b.includes("o'reilly"))
    return Wrench;
  if (combo.includes("atv") || combo.includes("outdoor") || combo.includes("bicycle") || b.includes("wolf pen"))
    return Bike;
  if (combo.includes("medical") || combo.includes("health") || combo.includes("clinic")) return Building2;
  return Store;
}

type LocalGuideListRowProps = {
  place: LocalGuideRow;
  saved: boolean;
  /** Restaurants only — subtle one-line family context */
  familyNote?: string;
  onOpen: () => void;
  onToggleSave: () => void;
  onCall: () => void;
  onDirections: () => void;
};

export function LocalGuideListRow({
  place,
  saved,
  familyNote,
  onOpen,
  onToggleSave,
  onCall,
  onDirections,
}: LocalGuideListRowProps) {
  const verified = isVerifiedRow(place);
  const isRestaurant = place.section === "restaurants";
  const storeGlyph = storeIcon(place);

  return (
    <div
      className={cn(
        "ar-surface-raised flex min-h-[4.5rem] items-stretch gap-0 overflow-hidden rounded-2xl touch-manipulation"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-start gap-3 py-3 pl-3 pr-2 text-left sm:gap-3.5 sm:pl-3.5"
      >
        {isRestaurant ? (
          <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-border/55 bg-muted/40 dark:border-white/10 dark:bg-black/20 sm:size-12">
            <Image
              src={place.imageUrl}
              alt=""
              width={48}
              height={48}
              className="size-full object-cover"
              sizes="48px"
            />
          </div>
        ) : (
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/55 bg-muted/50 dark:border-white/12 dark:bg-white/[0.06] sm:size-12"
            aria-hidden
          >
            {createElement(storeGlyph, {
              className: "size-5 text-primary/85",
              "aria-hidden": true,
            })}
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate font-heading text-[15px] font-semibold leading-tight tracking-tight text-foreground sm:text-base">
              {place.business}
            </span>
            {verified ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-emerald-400/28 bg-emerald-500/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-100/95">
                <ShieldCheck className="size-2.5" aria-hidden />
                Verified
              </span>
            ) : (
              <span className="shrink-0 rounded-full border border-border/55 bg-muted/45 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground dark:border-white/12 dark:bg-white/[0.04]">
                Confirm
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">{place.category}</p>
          <p className="flex items-start gap-1 text-[11px] leading-snug text-muted-foreground/95">
            <MapPin className="mt-0.5 size-3 shrink-0 text-primary/55" aria-hidden />
            <span className="line-clamp-2">{place.address || "Address not on file"}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            {place.phone ? (
              <span className="truncate font-mono text-[11px] text-foreground/85">{place.phone}</span>
            ) : (
              <span className="text-muted-foreground/80">No phone</span>
            )}
            <span className="text-muted-foreground/45">·</span>
            <span>{place.distanceMi} mi</span>
          </div>
          {familyNote ? (
            <p className="line-clamp-2 border-l border-primary/25 pl-2 text-[11px] leading-snug text-primary/75">
              {familyNote}
            </p>
          ) : null}
        </div>
      </button>

      <div className="flex w-[4.75rem] shrink-0 flex-col justify-center gap-1.5 border-l border-border/40 bg-muted/25 px-1.5 py-2 sm:w-[5.5rem] sm:px-2 dark:border-white/[0.07] dark:bg-black/15">
        <Button
          type="button"
          size="sm"
          variant="default"
          className="h-auto min-h-11 w-full flex-col gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-semibold leading-none sm:min-h-10 sm:text-[11px]"
          disabled={!place.phone}
          onClick={(e) => {
            e.stopPropagation();
            onCall();
          }}
        >
          <Phone className="size-3.5 shrink-0" aria-hidden />
          Call
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-auto min-h-11 w-full flex-col gap-0.5 rounded-lg border border-border/60 bg-card/80 px-1 py-1.5 text-[10px] font-semibold leading-none sm:min-h-10 sm:text-[11px] dark:border-white/14 dark:bg-white/[0.04]"
          onClick={(e) => {
            e.stopPropagation();
            onDirections();
          }}
        >
          <Navigation className="size-3.5 shrink-0" aria-hidden />
          <span className="text-center leading-tight">Directions</span>
        </Button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          className={cn(
            "flex h-9 w-full items-center justify-center rounded-lg border text-[11px] font-medium transition-colors",
            saved
              ? "border-primary/35 bg-primary/15 text-primary"
              : "border-border/55 bg-transparent text-muted-foreground hover:border-border/80 hover:text-foreground dark:border-white/12 dark:hover:border-white/18"
          )}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save place"}
        >
          <Heart className={cn("size-3.5", saved && "fill-current")} aria-hidden />
        </button>
      </div>
    </div>
  );
}
