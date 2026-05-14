"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarPlus, Home, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CalendarBookingSheet } from "@/components/ar-farmhouse/calendar-booking-sheet";
import { CalendarEventCard } from "@/components/ar-farmhouse/calendar-event-card";
import { CalendarFeedBridge } from "@/components/ar-farmhouse/calendar-feed-bridge";
import { CalendarOccupancyPanel } from "@/components/ar-farmhouse/calendar-occupancy-panel";
import {
  CalendarAgendaList,
  CalendarMonthBoard,
  CalendarViewModeTabs,
  CalendarWeekStrip,
  type CalendarSurfaceMode,
} from "@/components/ar-farmhouse/calendar-surfaces";
import { CalendarThisWeekendHub } from "@/components/ar-farmhouse/calendar-this-weekend-hub";
import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { demoCoordEvents } from "@/lib/calendar-demo";
import { demoCalendarMonth, demoWeekendEvents, type DemoCalendarDay } from "@/lib/social-demo";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

function monthWeekRows(leadingBlanks: number, daysInMonth: number): (number | null)[][] {
  const cells: (number | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

function rowIndexForDay(day: number, rows: (number | null)[][]) {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].includes(day)) return i;
  }
  return 0;
}

export function CalendarPropertyView() {
  const reduceMotion = useReducedMotion();
  const { openWeekendHub } = useEcosystem();
  const [boot, setBoot] = useState(true);
  const [mode, setMode] = useState<CalendarSurfaceMode>("month");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [previewDay, setPreviewDay] = useState<number | null>(null);

  const rows = useMemo(
    () => monthWeekRows(demoCalendarMonth.leadingBlanks, demoCalendarMonth.daysInMonth),
    []
  );
  const [weekIndex, setWeekIndex] = useState(() => rowIndexForDay(14, rows));

  const dayMap = useMemo(() => new Map(demoCalendarMonth.days.map((d) => [d.day, d])), []);

  const statusStyles: Record<string, string> = {
    open: "border-white/8 bg-white/[0.03] text-muted-foreground hover:border-white/16",
    booked: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100/90",
    busy: "border-amber-300/25 bg-amber-400/10 text-amber-50/90",
    checkout: "border-sky-400/25 bg-sky-500/10 text-sky-50/90",
  };

  useEffect(() => {
    const t = window.setTimeout(() => setBoot(false), reduceMotion ? 80 : 420);
    return () => window.clearTimeout(t);
  }, [reduceMotion]);

  const previewEvents = useMemo(() => {
    if (previewDay === null) return [];
    return demoCoordEvents.filter((e) => {
      const end = e.endDay ?? e.startDay;
      return previewDay >= e.startDay && previewDay <= end;
    });
  }, [previewDay]);

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden sm:space-y-6">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={cn(surface, "min-w-0 p-4 sm:p-6")}
      >
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              Property calendar
            </div>
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
              Coordinate the house like a quiet resort.
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Month, week, and agenda stay in sync — bookings, weekends, and feed moments share the same story.
            </p>
          </div>
          <div className="flex min-w-0 shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground touch-manipulation">
              <Home className="size-4 shrink-0 text-primary" aria-hidden />
              AR Farmhouse
            </span>
            <Button type="button" className="min-h-11 w-full rounded-xl touch-manipulation sm:w-auto" onClick={() => setBookingOpen(true)}>
              <CalendarPlus className="size-4" data-icon="inline-start" />
              New booking
            </Button>
          </div>
        </div>
      </motion.section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_min(100%,22rem)] xl:items-start xl:gap-6">
        <div className="min-w-0 space-y-5">
          <CalendarViewModeTabs mode={mode} onModeChange={setMode} />

          {boot ? (
            <div className={cn(surface, "min-w-0 space-y-4 p-4 sm:p-5")}>
              <Skeleton className="h-48 w-full rounded-2xl bg-white/[0.06]" />
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl bg-white/[0.06]" />
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {mode === "month" && (
                <motion.div
                  key="month"
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-3"
                >
                  <CalendarMonthBoard
                    dayMap={dayMap as Map<number, DemoCalendarDay>}
                    statusStyles={statusStyles}
                    events={demoCoordEvents}
                    previewDay={previewDay}
                    onDayHover={setPreviewDay}
                  />
                  <AnimatePresence>
                    {previewDay !== null && previewEvents.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn(surface, "overflow-hidden px-4 py-3")}
                      >
                        <p className="text-[11px] font-medium text-muted-foreground">May {previewDay}</p>
                        <ul className="mt-2 space-y-1">
                          {previewEvents.map((e) => (
                            <li key={e.id} className="text-sm text-foreground/90">
                              {e.title}
                              {e.timeLabel && <span className="text-muted-foreground"> · {e.timeLabel}</span>}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
              {mode === "week" && (
                <motion.div
                  key="week"
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CalendarWeekStrip events={demoCoordEvents} weekIndex={weekIndex} onWeekChange={setWeekIndex} />
                </motion.div>
              )}
              {mode === "agenda" && (
                <motion.div
                  key="agenda"
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <CalendarAgendaList events={demoCoordEvents} />
                </motion.div>
              )}
            </AnimatePresence>
          )}

          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground">This weekend · coordination</h3>
            <span className="text-[11px] text-muted-foreground">Shared lists · demo</span>
          </div>
          <CalendarThisWeekendHub onOpenCommandCenter={() => openWeekendHub("current")} />

          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground">Upcoming stays & trips</h3>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="size-3.5" aria-hidden />
              RSVP preview
            </span>
          </div>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {demoWeekendEvents.map((ev) => (
              <CalendarEventCard key={ev.id} event={ev} onOpenWeekendHub={() => openWeekendHub(ev.hubSlug)} />
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-5 xl:sticky xl:self-start xl:top-[calc(var(--ar-header-height)+0.75rem)] xl:space-y-4">
          <CalendarFeedBridge />
          <CalendarOccupancyPanel />
          <div className={cn(surface, "p-5")}>
            <p className="text-xs font-medium text-muted-foreground">Busy weekends</p>
            <div className="mt-3 space-y-2">
              {demoCalendarMonth.busyWeekends.map((w) => (
                <div
                  key={w.range}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{w.title}</p>
                    <p className="text-[10px] text-muted-foreground">{w.range}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      w.tone === "booked"
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90"
                        : "border-amber-300/30 bg-amber-400/10 text-amber-50/90"
                    )}
                  >
                    {w.occupancy}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CalendarBookingSheet open={bookingOpen} onOpenChange={setBookingOpen} />
    </div>
  );
}
