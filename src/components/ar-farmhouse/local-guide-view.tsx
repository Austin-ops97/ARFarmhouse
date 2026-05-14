"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Apple,
  Compass,
  Heart,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LocalGuideBusinessCard } from "@/components/ar-farmhouse/local-guide-business-card";
import { LocalGuideDetailSheet } from "@/components/ar-farmhouse/local-guide-detail-sheet";
import { LocalGuideMapPreview } from "@/components/ar-farmhouse/local-guide-map-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  data,
  familyRecommendations,
  featuredPresets,
  isVerifiedRow,
  matchesQuickCategory,
  restaurants,
  stores,
  verifiedOnly,
  type FeaturedPresetId,
  type QuickCategoryId,
} from "@/lib/local-guide";
import type { LocalGuideRow } from "@/lib/local-guide-types";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

const HERO_IMG =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2400&q=85";

const quickCategories: { id: QuickCategoryId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "restaurants", label: "Restaurants" },
  { id: "coffee", label: "Coffee" },
  { id: "grocery", label: "Grocery" },
  { id: "fuel", label: "Fuel" },
  { id: "outdoor", label: "Outdoor" },
  { id: "shopping", label: "Shopping" },
  { id: "hardware", label: "Hardware" },
  { id: "atv", label: "ATV" },
  { id: "emergency", label: "Emergency" },
];

const featuredLabels: Record<FeaturedPresetId, string> = {
  familyFavorites: "Family favorites",
  closestEssentials: "Closest essentials",
  bestBreakfast: "Best breakfast",
  lateNight: "Late night food",
  farmhouseSupplies: "Supplies for the farmhouse",
  atvOutdoor: "ATV & outdoor stops",
  groceryIce: "Grocery & ice",
  hardwareFuel: "Hardware & fuel",
};

const FEATURED_ORDER: FeaturedPresetId[] = [
  "familyFavorites",
  "closestEssentials",
  "bestBreakfast",
  "lateNight",
  "farmhouseSupplies",
  "atvOutdoor",
  "groceryIce",
  "hardwareFuel",
];

export function LocalGuideView() {
  const reduceMotion = useReducedMotion();
  const [boot, setBoot] = useState(true);
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState<QuickCategoryId>("all");
  const [verifiedOnlyToggle, setVerifiedOnlyToggle] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [detail, setDetail] = useState<LocalGuideRow | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    const t = window.setTimeout(() => setBoot(false), reduceMotion ? 100 : 520);
    return () => window.clearTimeout(t);
  }, [reduceMotion]);

  const placeByKey = useMemo(() => new Map(data.map((p) => [p.key, p])), []);

  const filtered = useMemo(() => {
    let list = data;
    if (quick !== "all") list = list.filter((item) => matchesQuickCategory(item, quick));
    if (verifiedOnlyToggle) list = list.filter((item) => isVerifiedRow(item));
    if (favoritesOnly) list = list.filter((item) => favorites.has(item.key));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((item) => {
        const blob = `${item.business} ${item.category} ${item.address} ${item.notes}`.toLowerCase();
        return blob.includes(q);
      });
    }
    return list;
  }, [data, quick, verifiedOnlyToggle, favoritesOnly, favorites, query]);

  const visibleList = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  useEffect(() => {
    setVisibleCount(24);
  }, [quick, verifiedOnlyToggle, favoritesOnly, query]);

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

  const featuredPick = (id: FeaturedPresetId) => {
    const keys = featuredPresets[id];
    return keys.map((k) => placeByKey.get(k)).filter(Boolean) as LocalGuideRow[];
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 shadow-[0_32px_90px_-40px_rgba(0,0,0,0.85)] sm:rounded-[1.75rem]">
        <div className="absolute inset-0">
          <Image src={HERO_IMG} alt="" fill className="object-cover" sizes="100vw" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-background/25" />
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,oklch(0.5_0.09_158/0.22),transparent_55%)]"
            animate={reduceMotion ? undefined : { opacity: [0.45, 0.65, 0.45] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="relative z-10 px-4 pb-10 pt-8 sm:px-8 sm:pb-12 sm:pt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-background/45 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-md">
            <Compass className="size-3.5 text-primary" aria-hidden />
            Mena & Ouachitas
          </div>
          <h1 className="mt-4 max-w-xl font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Local guide
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            Trusted stops for the farmhouse — curated like a private trip companion, not a phone book.
          </p>

          <div className="mt-8 max-w-xl space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search places, dishes, or errands…"
                className="h-12 rounded-2xl border-white/12 bg-background/55 pl-10 text-[15px] backdrop-blur-xl placeholder:text-muted-foreground/75"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl border-white/14 bg-background/40 backdrop-blur-md"
                onClick={() => setQuick("grocery")}
              >
                <Apple className="size-3.5" data-icon="inline-start" />
                Near farmhouse
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl border-white/14 bg-background/40 backdrop-blur-md"
                onClick={() => setQuick("atv")}
              >
                Wolf Pen day
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-[calc(env(safe-area-inset-top)+4.5rem)] z-20 -mx-4 border-b border-white/[0.07] bg-background/82 px-4 py-3 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/65 sm:static sm:top-0 sm:-mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none lg:top-2">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          {quickCategories.map((c) => {
            const active = quick === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setQuick(c.id)}
                className={cn(
                  "snap-start whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm",
                  active
                    ? "border-primary/35 bg-primary/15 text-foreground"
                    : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/16 hover:text-foreground"
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
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
              favoritesOnly ? "border-primary/35 bg-primary/12 text-foreground" : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/16"
            )}
          >
            <Heart className={cn("size-3.5", favoritesOnly && "fill-current text-primary")} aria-hidden />
            Saved{favorites.size > 0 && ` (${favorites.size})`}
          </button>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {restaurants.length} eats · {stores.length} shops · {verifiedOnly.length} verified
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="min-w-0 space-y-8">
          {FEATURED_ORDER.map((fid) => {
            const picks = featuredPick(fid);
            if (!picks.length) return null;
            return (
              <section key={fid} className="space-y-3">
                <div className="flex items-end justify-between gap-2 px-0.5">
                  <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    {featuredLabels[fid]}
                  </h2>
                  <span className="text-[11px] text-muted-foreground">Curated</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
                  {picks.map((place) => (
                    <div key={place.key} className="w-[min(100%,280px)] shrink-0 snap-start sm:w-auto">
                      <LocalGuideBusinessCard
                        place={place}
                        saved={favorites.has(place.key)}
                        onToggleSave={() => toggleFavorite(place.key)}
                        onOpen={() => setDetail(place)}
                        onCall={() => tryCall(place)}
                        onDirections={() => openMaps(place)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-2 px-0.5">
              <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                All matches
              </h2>
              <span className="text-[11px] text-muted-foreground">{filtered.length} places</span>
            </div>
            {boot ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={cn(surface, "overflow-hidden")}>
                    <Skeleton className="aspect-[16/10] w-full rounded-none bg-white/[0.06]" />
                    <div className="space-y-2 p-4">
                      <Skeleton className="h-4 w-[66%] max-w-[240px] rounded-full bg-white/[0.06]" />
                      <Skeleton className="h-3 w-full rounded-full bg-white/[0.05]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={`${quick}-${verifiedOnlyToggle}-${favoritesOnly}-${query}`}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2"
                >
                  {visibleList.map((place) => (
                    <LocalGuideBusinessCard
                      key={place.key}
                      place={place}
                      saved={favorites.has(place.key)}
                      onToggleSave={() => toggleFavorite(place.key)}
                      onOpen={() => setDetail(place)}
                      onCall={() => tryCall(place)}
                      onDirections={() => openMaps(place)}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
            {!boot && visibleCount < filtered.length && (
              <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => setVisibleCount((n) => n + 24)}>
                Load more
              </Button>
            )}
          </section>
        </div>

        <aside className="hidden space-y-4 lg:block">
          <div className={cn(surface, "p-5")}>
            <p className="text-xs font-medium text-muted-foreground">Map preview</p>
            <LocalGuideMapPreview className="mt-3 h-44 w-full" />
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Pins are illustrative. Open Apple Maps for real routing when you&apos;re ready.
            </p>
          </div>
          <div className={cn(surface, "p-5")}>
            <p className="text-xs font-medium text-muted-foreground">Family layer</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {Object.keys(familyRecommendations).length} handwritten notes from the thread — favorited spots sync here first.
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-primary">
              <Sparkles className="size-3.5" aria-hidden />
              <span>Tip: save breakfast picks before ATV days.</span>
            </div>
          </div>
          <div className={cn(surface, "p-5")}>
            <p className="text-xs font-medium text-muted-foreground">Dataset</p>
            <ul className="mt-2 space-y-2 text-[11px] text-muted-foreground">
              <li className="flex justify-between gap-2">
                <span>Restaurants slice</span>
                <span className="font-mono text-foreground/80">{restaurants.length}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Stores slice</span>
                <span className="font-mono text-foreground/80">{stores.length}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Verified filter</span>
                <span className="font-mono text-foreground/80">{verifiedOnly.length}</span>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <LocalGuideDetailSheet place={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
