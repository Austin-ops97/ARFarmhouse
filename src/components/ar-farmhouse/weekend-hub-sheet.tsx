"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  CloudSun,
  Compass,
  Heart,
  MapPin,
  Ship,
  ShoppingBasket,
  Sparkles,
  Tent,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { WeekendHubAlbumStrip } from "@/components/ar-farmhouse/weekend-hub-album-strip";
import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useHubPropertyOps } from "@/hooks/use-hub-property-ops";
import { resolveWeekendHubBundle } from "@/lib/weekend-hub-hydrate";
import type { WeekendHubSlug } from "@/lib/weekend-hub-slug";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import { cn } from "@/lib/utils";

const surface = cn("ar-surface-raised rounded-2xl");

function countdownParts(targetMs: number, now: number) {
  const diff = targetMs - now;
  if (diff <= 0) return { line: "Now", sub: "You’re in the window" };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return { line: `${days}d ${hours}h`, sub: "Until kickoff" };
  const mins = Math.floor((diff % 3600000) / 60000);
  return { line: `${hours}h ${mins}m`, sub: "Closing in" };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

type WeekendHubSheetProps = {
  open: boolean;
  slug: WeekendHubSlug;
  calendarEvents?: PropertyCalendarEvent[];
  onClose: () => void;
};

export function WeekendHubSheet({ open, slug, calendarEvents = [], onClose }: WeekendHubSheetProps) {
  const reduceMotion = useReducedMotion();
  const { goTo } = useEcosystem();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [open]);

  const { statusCards, inventory } = useHubPropertyOps(open);
  const bundle = useMemo(
    () => resolveWeekendHubBundle(slug, calendarEvents, new Date(), { statusCards, inventory }),
    [slug, calendarEvents, statusCards, inventory]
  );

  const cd = useMemo(() => {
    return countdownParts(Date.parse(bundle.startIso), now);
  }, [bundle, now]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[52] flex items-end justify-center sm:items-end sm:justify-center sm:p-4 md:items-center md:p-6 lg:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.22 }}
        >
          <button
            type="button"
            className="ar-scrim absolute inset-0"
            aria-label="Close"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="weekend-hub-title"
            initial={reduceMotion ? false : { y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={cn(
              "ar-modal-shell relative z-10 flex max-h-[min(90dvh,100dvh)] w-full max-w-[100vw] flex-col overflow-hidden rounded-t-[1.75rem]",
              "touch-manipulation sm:max-h-[min(94dvh,920px)] sm:max-w-2xl sm:rounded-[1.75rem]"
            )}
          >
            <div className="relative h-40 shrink-0 sm:h-48">
              <Image src={bundle.hero} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 672px" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
              <div className="absolute left-4 right-4 top-[max(0.75rem,env(safe-area-inset-top))] flex items-start justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/75 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur-md dark:border-white/15 dark:bg-background/55">
                  <Sparkles className="size-3 text-primary" aria-hidden />
                  Weekend hub
                </div>
                <Button type="button" variant="ghost" size="icon" className="rounded-full bg-background/50 text-foreground" onClick={onClose} aria-label="Close">
                  <X className="size-4" />
                </Button>
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-primary/90">Command center</p>
                  <h2 id="weekend-hub-title" className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {bundle.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{bundle.dateLabel}</p>
                </div>
                <div className="rounded-2xl border border-border/55 bg-card/85 px-3 py-2 text-right backdrop-blur-md dark:border-white/15 dark:bg-background/60">
                  <p className="font-heading text-lg font-semibold tabular-nums tracking-tight text-foreground sm:text-xl">{cd.line}</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/88">{cd.sub}</p>
                  <p className="mt-3 flex items-center justify-end gap-1.5 text-[11px] font-medium text-foreground/80">
                    <CloudSun className="size-3.5 text-mist" aria-hidden />
                    {bundle.weather.label}
                  </p>
                  {bundle.weather.highF != null && bundle.weather.lowF != null ? (
                    <p className="text-sm font-semibold text-foreground">
                      {bundle.weather.highF}° / {bundle.weather.lowF}°
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
              {bundle.memoryEcho && (
                <div className={cn(surface, "mb-4 p-4")}>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-primary/90">
                    <Heart className="size-3.5" aria-hidden />
                    Shared memory
                  </div>
                  <p className="mt-2 font-heading text-base font-semibold text-foreground">{bundle.memoryEcho.headline}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{bundle.memoryEcho.detail}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground/80">{bundle.memoryEcho.yearLabel}</p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className={cn(surface, "p-4")}>
                  <p className="text-xs font-medium text-muted-foreground">Occupancy</p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">{bundle.occupancySummary}</p>
                  {bundle.notes && <p className="mt-2 text-xs text-muted-foreground">{bundle.notes}</p>}
                </div>
                <div className={cn(surface, "p-4")}>
                  <p className="text-xs font-medium text-muted-foreground">Property awareness</p>
                  <ul className="mt-2 space-y-1.5 text-[12px] text-muted-foreground">
                    {bundle.propertyPulse.map((p) => (
                      <li key={p.label} className="flex justify-between gap-2">
                        <span>{p.label}</span>
                        <span className="text-right text-foreground/90">{p.value}</span>
                      </li>
                    ))}
                  </ul>
                  {bundle.trailNote && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/90">{bundle.trailNote}</p>}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className={cn(surface, "p-4")}>
                  <p className="text-xs font-medium text-muted-foreground">Arrivals</p>
                  <ul className="mt-2 space-y-2">
                    {bundle.arrivals.map((a) => (
                      <li key={a.name} className="ar-surface-inset flex items-center gap-2 rounded-xl px-2.5 py-2">
                        <Avatar size="sm" className="ring-2 ring-background/80">
                          <AvatarImage src={a.avatar} alt="" />
                          <AvatarFallback>{initials(a.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {a.eta} · {a.mode}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={cn(surface, "p-4")}>
                  <p className="text-xs font-medium text-muted-foreground">Departures</p>
                  <ul className="mt-2 space-y-2">
                    {bundle.departures.map((d) => (
                      <li key={d.name} className="ar-surface-inset flex items-start gap-2 rounded-xl px-2.5 py-2">
                        <Clock className="mt-0.5 size-3.5 shrink-0 text-primary/80" aria-hidden />
                        <div>
                          <p className="text-sm font-medium text-foreground">{d.name}</p>
                          <p className="text-[11px] text-muted-foreground">{d.etd}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground/90">{d.note}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className={cn(surface, "p-4")}>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <UtensilsCrossed className="size-3.5 text-primary" aria-hidden />
                    Meal plan
                  </div>
                  <ul className="mt-2 space-y-2">
                    {bundle.mealPlan.map((m) => (
                      <li key={m.meal} className="ar-surface-inset rounded-xl px-2.5 py-2">
                        <p className="text-sm font-medium text-foreground">{m.meal}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {m.chef} · {m.dish}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={cn(surface, "p-4")}>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Tent className="size-3.5 text-primary" aria-hidden />
                    Plans
                  </div>
                  <ul className="mt-2 space-y-2">
                    {bundle.activities.map((a) => (
                      <li key={a.title} className="ar-surface-inset rounded-xl px-2.5 py-2">
                        <p className="text-sm font-medium text-foreground">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.when} · {a.people.join(", ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <WeekendHubAlbumStrip eventTitle={bundle.title} />

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className={cn(surface, "p-4")}>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <ShoppingBasket className="size-3.5 text-primary" aria-hidden />
                    Grocery coordination
                  </div>
                  <ul className="mt-2 space-y-2">
                    {bundle.grocery.slice(0, 5).map((g) => (
                      <li key={g.item} className="ar-surface-inset flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-foreground/90">
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full border",
                            g.done ? "border-primary/35 bg-primary/15 text-primary" : "border-border/55 bg-muted/70 dark:border-white/12 dark:bg-white/[0.04]"
                          )}
                        >
                          {g.done ? <Check className="size-3" aria-hidden /> : null}
                        </span>
                        <span className={cn("min-w-0 flex-1", g.done && "text-muted-foreground line-through")}>{g.item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={cn(surface, "p-4")}>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Compass className="size-3.5 text-primary" aria-hidden />
                    Local guide · contextual
                  </div>
                  <ul className="mt-2 space-y-2">
                    {bundle.guidePicks.map((g) => (
                      <li key={g.title} className="ar-surface-inset rounded-xl px-2.5 py-2">
                        <p className="text-sm font-medium text-foreground">{g.title}</p>
                        <p className="text-[11px] text-primary/85">{g.category}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{g.reason}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <div className={cn(surface, "p-4")}>
                  <p className="text-xs font-medium text-muted-foreground">Tasks before arrival</p>
                  <ul className="mt-2 space-y-2">
                    {bundle.tasksBeforeArrival.map((t) => (
                      <li key={t.id} className="ar-surface-inset flex items-center justify-between gap-2 rounded-xl px-2.5 py-2">
                        <span className="text-sm text-foreground/90">{t.title}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{t.dueLabel}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full rounded-xl"
                    onClick={() => {
                      onClose();
                      goTo("tasks");
                    }}
                  >
                    Open Tasks
                    <ChevronRight className="size-4 opacity-70" data-icon="inline-end" />
                  </Button>
                </div>
                <div className={cn(surface, "p-4")}>
                  <p className="text-xs font-medium text-muted-foreground">Recent related posts</p>
                  <ul className="mt-2 space-y-2">
                    {bundle.relatedFeedLines.map((r, i) => (
                      <li key={`${r.author}-${i}`} className="ar-surface-inset rounded-xl px-2.5 py-2 text-[13px] text-muted-foreground">
                        <span className="font-medium text-foreground">{r.author}</span> {r.text}
                        <span className="mt-1 block text-[10px] text-muted-foreground/80">{r.timeLabel}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full rounded-xl"
                    onClick={() => {
                      onClose();
                      goTo("feed");
                    }}
                  >
                    Go to Feed
                    <ChevronRight className="size-4 opacity-70" data-icon="inline-end" />
                  </Button>
                </div>
              </div>

              <div className={cn(surface, "mt-4 p-4")}>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Ship className="size-3.5 text-primary" aria-hidden />
                  Supplies & equipment
                </div>
                <ul className="mt-2 space-y-1.5 text-[12px] text-muted-foreground">
                  {bundle.supplies.map((s) => (
                    <li key={s.item}>
                      <span className="font-medium text-foreground">{s.item}</span> — {s.status}
                    </li>
                  ))}
                </ul>
                <Separator className="my-3 bg-border/50 dark:bg-white/10" />
                <ul className="space-y-1 text-[12px] text-muted-foreground">
                  {bundle.equipment.map((e) => (
                    <li key={e.item}>
                      <span className="font-medium text-foreground">{e.item}</span> · {e.who} — {e.note}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-muted-foreground">Packing nudges</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {bundle.packing.map((p) => (
                    <span key={p} className="rounded-full border border-border/55 bg-secondary/80 px-2.5 py-1 text-[10px] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-4 dark:border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    onClose();
                    goTo("calendar");
                  }}
                >
                  <Calendar className="size-4" data-icon="inline-start" />
                  Calendar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    onClose();
                    goTo("guide");
                  }}
                >
                  <MapPin className="size-4" data-icon="inline-start" />
                  Local guide
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
