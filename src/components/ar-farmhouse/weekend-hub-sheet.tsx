"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Calendar,
  ChevronRight,
  Clock,
  CloudSun,
  Compass,
  Heart,
  MapPin,
  Sparkles,
  Tent,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { WeekendHubAlbumStrip } from "@/components/ar-farmhouse/weekend-hub-album-strip";
import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useHubPropertyOps } from "@/hooks/use-hub-property-ops";
import { OverlayPortal } from "@/components/ar-farmhouse/overlay-portal";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { AR_BOTTOM_SHEET_HOST, AR_MOBILE_SHEET, AR_OVERLAY_SCRIM } from "@/lib/mobile-overlay";
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
  useBodyScrollLock(open);
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
        <OverlayPortal>
        <motion.div
          className={cn(
            AR_BOTTOM_SHEET_HOST,
            "z-[52] sm:items-end md:items-center",
            "sm:p-4 md:p-6 lg:p-8"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.22 }}
        >
          <button
            type="button"
            className={AR_OVERLAY_SCRIM}
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
              AR_MOBILE_SHEET,
              "max-w-[100vw] touch-manipulation",
              "sm:max-h-[min(94dvh,920px)] sm:max-w-2xl sm:rounded-[1.75rem]"
            )}
          >
            <div className="relative shrink-0 overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/[0.1] via-background to-muted/25 px-4 pb-6 pt-[max(0.5rem,env(safe-area-inset-top))] dark:border-white/10">
              <div className="relative mb-6 flex flex-wrap items-start justify-between gap-3 pt-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/75 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur-md dark:border-white/15 dark:bg-background/55">
                  <Sparkles className="size-3 text-primary" aria-hidden />
                  Weekend hub
                </div>
                <Button type="button" variant="ghost" size="icon" className="rounded-full bg-background/50 text-foreground" onClick={onClose} aria-label="Close">
                  <X className="size-4" />
                </Button>
              </div>
              <div className="relative flex flex-wrap items-end justify-between gap-3">
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

              <div className="mt-4">
                <div className={cn(surface, "p-4")}>
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Tent className="size-3.5 text-primary" aria-hidden />
                    Plans & activities
                  </div>
                  <ul className="mt-2 space-y-2">
                    {bundle.activities.length === 0 ? (
                      <li className="ar-surface-inset rounded-xl px-2.5 py-3 text-sm text-muted-foreground">
                        Activities from the calendar will show here when the weekend is booked.
                      </li>
                    ) : (
                      bundle.activities.map((a) => (
                        <li key={a.title} className="ar-surface-inset rounded-xl px-2.5 py-2">
                          <p className="text-sm font-medium text-foreground">{a.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {a.when} · {a.people.join(", ")}
                          </p>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <WeekendHubAlbumStrip eventTitle={bundle.title} />

              <div className="mt-4">
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

              <div className="mt-4 rounded-2xl border border-border/50 bg-muted/15 px-4 py-3 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
                Meal planning and shared groceries now live on the <span className="font-medium text-foreground">Calendar</span> tab so the whole crew sees one coordinated list.
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
        </OverlayPortal>
      ) : null}
    </AnimatePresence>
  );
}
