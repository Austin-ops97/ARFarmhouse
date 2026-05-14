"use client";

import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Compass, Heart, Search, ShieldCheck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { LocalGuideDetailSheet } from "@/components/ar-farmhouse/local-guide-detail-sheet";
import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { LocalGuideListRow } from "@/components/ar-farmhouse/local-guide-list-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  familyRecommendations,
  isVerifiedRow,
  restaurants,
  stores,
  verifiedOnly,
} from "@/lib/local-guide";
import type { LocalGuideRow } from "@/lib/local-guide-types";
import { cn } from "@/lib/utils";

type GuideSegment = "restaurants" | "stores";

const segments: GuideSegment[] = ["restaurants", "stores"];

export function LocalGuideView() {
  const reduceMotion = useReducedMotion();
  const { openWeekendHub } = useEcosystem();
  const [segment, setSegment] = useState<GuideSegment>("restaurants");
  const [query, setQuery] = useState("");
  const [verifiedOnlyToggle, setVerifiedOnlyToggle] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [detail, setDetail] = useState<LocalGuideRow | null>(null);

  const basePool = segment === "restaurants" ? restaurants : stores;

  const filtered = useMemo(() => {
    let list = basePool;
    if (verifiedOnlyToggle) list = list.filter((item) => isVerifiedRow(item));
    if (favoritesOnly) list = list.filter((item) => favorites.has(item.key));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        const blob = `${item.business} ${item.category}`.toLowerCase();
        return blob.includes(q);
      });
    }
    return list;
  }, [basePool, verifiedOnlyToggle, favoritesOnly, favorites, query]);

  const toggleFavorite = useCallback((key: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const openMaps = useCallback((place: LocalGuideRow) => {
    const url = `https://maps.apple.com/?q=${encodeURIComponent(place.address || place.business)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const tryCall = useCallback((place: LocalGuideRow) => {
    if (!place.phone) return;
    window.location.href = `tel:${place.phone.replace(/[^\d+]/g, "")}`;
  }, []);

  const segTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 520, damping: 38, mass: 0.35 };

  return (
    <div className="pb-6">
      <div className="mb-4 px-0.5 sm:mb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-md">
          <Compass className="size-3.5 text-primary" aria-hidden />
          Mena & Ouachitas
        </div>
        <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Local guide
        </h1>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
          Food and shops around the farmhouse — built for quick taps on the road.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => openWeekendHub("current")}>
            Weekend hub · trip context
          </Button>
          <span className="text-[11px] text-muted-foreground">Breakfast & essentials surface in the hub before arrivals.</span>
        </div>
      </div>

      <div
        className={cn(
          "sticky z-30 -mx-3 border-b border-white/[0.08] bg-background/[0.92] px-3 py-3 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/78 sm:-mx-4 sm:px-4",
          "top-[var(--ar-mobile-sticky-top,calc(env(safe-area-inset-top)+4rem))] sm:top-[calc(env(safe-area-inset-top)+5rem)]"
        )}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={segment === "restaurants" ? "Search restaurants…" : "Search stores…"}
            className="h-11 rounded-2xl border-white/12 bg-white/[0.05] pl-10 text-[15px] backdrop-blur-xl placeholder:text-muted-foreground/75"
          />
        </div>

        <LayoutGroup id="local-guide-segments">
          <div
            className="mt-3 grid grid-cols-2 gap-0 rounded-2xl border border-white/10 bg-black/25 p-1"
            role="tablist"
            aria-label="Listing type"
          >
            {segments.map((id) => {
              const active = segment === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSegment(id)}
                  className={cn(
                    "relative z-0 rounded-[0.65rem] py-2.5 text-sm font-semibold transition-colors duration-150",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground/90"
                  )}
                >
                  {active ? (
                    reduceMotion ? (
                      <span className="absolute inset-0 rounded-[0.65rem] border border-primary/25 bg-primary/[0.16] shadow-[0_8px_28px_-16px_rgba(0,0,0,0.65)]" />
                    ) : (
                      <motion.span
                        layoutId="local-guide-segment-pill"
                        className="absolute inset-0 rounded-[0.65rem] border border-primary/25 bg-primary/[0.16] shadow-[0_8px_28px_-16px_rgba(0,0,0,0.65)]"
                        transition={segTransition}
                      />
                    )
                  ) : null}
                  <span className="relative z-10">{id === "restaurants" ? "Restaurants" : "Stores"}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setVerifiedOnlyToggle((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
              verifiedOnlyToggle
                ? "border-emerald-400/35 bg-emerald-500/12 text-emerald-50"
                : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/16"
            )}
          >
            <ShieldCheck className="size-3.5" aria-hidden />
            Verified only
          </button>
          <button
            type="button"
            onClick={() => setFavoritesOnly((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
              favoritesOnly
                ? "border-primary/35 bg-primary/12 text-foreground"
                : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/16"
            )}
          >
            <Heart className={cn("size-3.5", favoritesOnly && "fill-current text-primary")} aria-hidden />
            Saved{favorites.size > 0 ? ` (${favorites.size})` : ""}
          </button>
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
            {filtered.length} listed · {verifiedOnly.length} verified total
          </span>
        </div>
      </div>

      <motion.div
        key={segment}
        initial={reduceMotion ? false : { opacity: 0.92 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.12 }}
        className="mt-4 space-y-2 [-webkit-overflow-scrolling:touch]"
      >
        {filtered.length === 0 ? (
          <div
            className={cn(
              "rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-muted-foreground backdrop-blur-md"
            )}
          >
            No matches. Try another search or toggle filters.
          </div>
        ) : (
          filtered.map((place) => (
            <LocalGuideListRow
              key={place.key}
              place={place}
              saved={favorites.has(place.key)}
              familyNote={
                place.section === "restaurants" ? familyRecommendations[place.key] : undefined
              }
              onOpen={() => setDetail(place)}
              onToggleSave={() => toggleFavorite(place.key)}
              onCall={() => tryCall(place)}
              onDirections={() => openMaps(place)}
            />
          ))
        )}
      </motion.div>

      <LocalGuideDetailSheet place={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
