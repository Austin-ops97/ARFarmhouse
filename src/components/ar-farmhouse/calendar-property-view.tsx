"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarPlus, ChevronLeft, ChevronRight, Home, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { CalendarBookingSheet } from "@/components/ar-farmhouse/calendar-booking-sheet";
import { CalendarDayEventsSheet } from "@/components/ar-farmhouse/calendar-day-events-sheet";
import { CalendarOccupancyPanel } from "@/components/ar-farmhouse/calendar-occupancy-panel";
import { CalendarSharedGrocerPanel } from "@/components/ar-farmhouse/calendar-shared-grocer-panel";
import {
  CalendarAgendaList,
  CalendarMonthBoard,
  CalendarViewModeTabs,
  CalendarWeekStrip,
  type CalendarSurfaceMode,
} from "@/components/ar-farmhouse/calendar-surfaces";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildUpcomingStays, mergeEventsIntoMonthMeta } from "@/lib/calendar-event-merge";
import type { CalendarGridDay } from "@/lib/calendar-month-meta";
import { useCalendarMonthMeta, usePropertyData } from "@/contexts/property-data-context";
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
  const { calendarEvents, calendarEventsForOps, calendarError, calendarLoading, shiftCalendarMonth, calendarViewDate } =
    usePropertyData();
  const baseMonth = useCalendarMonthMeta();
  const [mode, setMode] = useState<CalendarSurfaceMode>("month");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const calendarMonth = useMemo(
    () => mergeEventsIntoMonthMeta(baseMonth, calendarEvents),
    [baseMonth, calendarEvents]
  );
  const upcomingStays = useMemo(
    () => buildUpcomingStays(calendarEventsForOps, calendarViewDate),
    [calendarEventsForOps, calendarViewDate]
  );
  const rows = useMemo(
    () => monthWeekRows(calendarMonth.leadingBlanks, calendarMonth.daysInMonth),
    [calendarMonth.leadingBlanks, calendarMonth.daysInMonth]
  );
  const [weekIndex, setWeekIndex] = useState(() =>
    rowIndexForDay(calendarMonth.todayDay ?? 1, rows)
  );

  const dayMap = useMemo(() => new Map(calendarMonth.days.map((d) => [d.day, d])), [calendarMonth.days]);

  const statusStyles: Record<string, string> = {
    open: "border-white/8 bg-white/[0.03] text-muted-foreground hover:border-white/16",
    booked: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100/90",
    busy: "border-amber-300/25 bg-amber-400/10 text-amber-50/90",
    checkout: "border-sky-400/25 bg-sky-500/10 text-sky-50/90",
  };
  const handleDaySheetOpen = (open: boolean) => {
    setDaySheetOpen(open);
    if (!open) setSelectedDay(null);
  };

  return (
    <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden sm:space-y-6">
      {calendarError && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/95">
          Calendar could not sync: {calendarError}
        </p>
      )}
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
              Bookings stay light and operational — tap a date to review every detail in one glance.
            </p>
          </div>
          <div className="flex min-w-0 shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground touch-manipulation">
              <Home className="size-4 shrink-0 text-primary" aria-hidden />
              AR Farmhouse
            </span>
            <Button
              type="button"
              className="min-h-11 w-full rounded-xl touch-manipulation sm:w-auto"
              onClick={() => setBookingOpen(true)}
            >
              <CalendarPlus className="size-4" data-icon="inline-start" />
              New booking
            </Button>
          </div>
        </div>
      </motion.section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_min(100%,22rem)] xl:items-start xl:gap-6">
        <div className="min-w-0 space-y-5">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => shiftCalendarMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="min-w-0 flex-1 text-center font-heading text-sm font-semibold text-foreground sm:text-base">
              {calendarMonth.label}
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl"
              onClick={() => shiftCalendarMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <CalendarViewModeTabs mode={mode} onModeChange={setMode} />

          {calendarLoading ? (
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
                    calendarMonth={calendarMonth}
                    dayMap={dayMap as Map<number, CalendarGridDay>}
                    statusStyles={statusStyles}
                    events={calendarEvents}
                    selectedDay={selectedDay}
                    onDaySelect={(d) => {
                      setSelectedDay(d);
                      setDaySheetOpen(true);
                    }}
                  />
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
                  <CalendarWeekStrip
                    calendarMonth={calendarMonth}
                    events={calendarEvents}
                    weekIndex={weekIndex}
                    onWeekChange={setWeekIndex}
                  />
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
                  <CalendarAgendaList events={calendarEvents} monthLabel={calendarMonth.label} />
                </motion.div>
              )}
            </AnimatePresence>
          )}

          <CalendarSharedGrocerPanel />

          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground">Upcoming stays &amp; trips</h3>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Users className="size-3.5" aria-hidden />
              From your calendar
            </span>
          </div>
          {upcomingStays.length === 0 ? (
            <div
              className={cn(
                surface,
                "flex min-h-[12rem] flex-col items-center justify-center gap-3 p-8 text-center sm:min-h-[14rem]"
              )}
            >
              <p className="font-heading text-lg font-semibold text-foreground">Book your next stay</p>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Upcoming family trips will appear here with dates, headcount, and who is coming.
              </p>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setBookingOpen(true)}>
                Start a booking
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingStays.map((stay) => (
                <div
                  key={stay.id}
                  className={cn(surface, "flex flex-col gap-2 p-4 text-left sm:flex-row sm:items-center sm:justify-between")}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{stay.title}</p>
                    <p className="text-[12px] text-muted-foreground">{stay.rangeLabel}</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">{stay.attendeePreview}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-foreground">
                    {stay.guests} guest{stay.guests === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-5 xl:sticky xl:self-start xl:top-[calc(var(--ar-header-height)+0.75rem)] xl:space-y-4">
          <CalendarOccupancyPanel
            calendarMonth={calendarMonth}
            gridEvents={calendarEvents}
            opsEvents={calendarEventsForOps}
          />
        </div>
      </div>

      <CalendarDayEventsSheet
        open={daySheetOpen}
        onOpenChange={handleDaySheetOpen}
        day={selectedDay}
        year={calendarMonth.year}
        monthIndex={calendarMonth.monthIndex}
        events={calendarEvents}
      />
      <CalendarBookingSheet
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        viewDate={calendarViewDate}
        existingEvents={calendarEvents}
      />
    </div>
  );
}
