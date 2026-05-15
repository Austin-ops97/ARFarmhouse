"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Rows3 } from "lucide-react";
import { useMemo, useRef } from "react";

import type { CalendarGridDay, CalendarMonthMeta } from "@/lib/calendar-month-meta";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import { cn } from "@/lib/utils";

const surface = cn("ar-surface-raised rounded-[1.35rem]");

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"] as const;

export type CalendarSurfaceMode = "month" | "week" | "agenda";

const accentDot: Record<PropertyCalendarEvent["accent"], string> = {
  mint: "bg-emerald-400/80",
  amber: "bg-amber-300/85",
  rose: "bg-rose-400/80",
  sky: "bg-sky-400/80",
  violet: "bg-violet-400/75",
  slate: "bg-zinc-400/70",
  emerald: "bg-emerald-300/85",
};

function eventsForDay(day: number, events: PropertyCalendarEvent[]) {
  return events.filter((e) => {
    const end = e.endDay ?? e.startDay;
    return day >= e.startDay && day <= end;
  });
}

function agendaRows(events: PropertyCalendarEvent[], monthName: string) {
  const sorted = [...events].sort((a, b) => a.startDay - b.startDay || a.title.localeCompare(b.title));
  return sorted.map((e) => ({
    ...e,
    rangeLabel:
      e.endDay && e.endDay !== e.startDay
        ? `${monthName} ${e.startDay}–${e.endDay}`
        : `${monthName} ${e.startDay}`,
  }));
}

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

export function CalendarViewModeTabs({
  mode,
  onModeChange,
}: {
  mode: CalendarSurfaceMode;
  onModeChange: (m: CalendarSurfaceMode) => void;
}) {
  const tabs: { id: CalendarSurfaceMode; label: string; icon: typeof LayoutGrid }[] = [
    { id: "month", label: "Month", icon: LayoutGrid },
    { id: "week", label: "Week", icon: Rows3 },
    { id: "agenda", label: "Agenda", icon: List },
  ];
  return (
    <div className="ar-surface-float flex min-h-11 w-full min-w-0 max-w-full rounded-2xl p-1">
      {tabs.map((t) => {
        const active = mode === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onModeChange(t.id)}
            className={cn(
              "relative flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition-colors sm:min-h-10 sm:gap-1.5 sm:py-2.5 sm:text-sm",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="cal-tab"
                className="absolute inset-0 rounded-xl border border-primary/25 bg-primary/12"
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            )}
            <Icon className="relative z-10 size-3.5 sm:size-4" aria-hidden />
            <span className="relative z-10">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

type CalendarMonthBoardProps = {
  calendarMonth: CalendarMonthMeta;
  dayMap: Map<number, CalendarGridDay>;
  statusStyles: Record<string, string>;
  events: PropertyCalendarEvent[];
  selectedDay: number | null;
  onDaySelect: (day: number) => void;
};

export function CalendarMonthBoard({
  calendarMonth,
  dayMap,
  statusStyles,
  events,
  selectedDay,
  onDaySelect,
}: CalendarMonthBoardProps) {
  const reduceMotion = useReducedMotion();
  const rows = useMemo(
    () => monthWeekRows(calendarMonth.leadingBlanks, calendarMonth.daysInMonth),
    [calendarMonth.leadingBlanks, calendarMonth.daysInMonth]
  );

  return (
    <div className={cn(surface, "min-w-0 max-w-full p-2 sm:p-5")}>
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2 sm:mb-4">
        <p className="min-w-0 truncate font-heading text-sm font-semibold text-foreground sm:text-lg">
          {calendarMonth.label}
        </p>
        <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">Swipe week row on mobile</span>
      </div>
      <div className="grid min-w-0 grid-cols-7 gap-px text-center text-[9px] font-medium text-muted-foreground sm:gap-1 sm:text-[11px]">
        {weekdayLabels.map((w, i) => (
          <span key={`${w}-${i}`} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div className="mt-1 min-w-0 space-y-px sm:mt-2 sm:space-y-1">
        {rows.map((row, ri) => (
          <div key={ri} className="grid min-w-0 grid-cols-7 gap-px sm:gap-1">
            {row.map((day, ci) => {
              if (day === null) {
                return <div key={`e-${ri}-${ci}`} className="aspect-square min-h-0 min-w-0 rounded-lg bg-transparent" />;
              }
              const info = dayMap.get(day);
              const st = info?.status ?? "open";
              const isToday = calendarMonth.todayDay !== null && day === calendarMonth.todayDay;
              const dayEvents = eventsForDay(day, events);
              const preview = selectedDay === day;
              return (
                <motion.button
                  key={day}
                  type="button"
                  layout={false}
                  onClick={() => onDaySelect(day)}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  className={cn(
                    "relative flex min-h-[2.75rem] min-w-0 flex-col items-center justify-center rounded-md border p-0.5 text-[9px] font-medium transition-colors sm:aspect-square sm:min-h-0 sm:rounded-xl sm:text-[11px]",
                    statusStyles[st] ?? statusStyles.open,
                    isToday && "ring-2 ring-primary/45",
                    preview && "ring-1 ring-sky-400/50"
                  )}
                >
                  <span className={cn("tabular-nums sm:text-[12px]", isToday && "text-primary")}>{day}</span>
                  <div className="mt-0.5 flex max-w-full flex-wrap justify-center gap-px sm:mt-1 sm:gap-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span key={ev.id} className={cn("size-1.5 rounded-full", accentDot[ev.accent])} title={ev.title} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] font-medium text-muted-foreground">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                  {info?.guests?.[0] && (
                    <span className="absolute bottom-0.5 left-0 right-0 truncate px-px text-[6px] font-medium text-muted-foreground/90 sm:bottom-1 sm:px-0.5 sm:text-[7px]">
                      {info.guests[0]}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}
      </div>
      {events.length === 0 && (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-3 text-center text-[11px] leading-relaxed text-muted-foreground">
          No events this month yet. Add a booking or post a weekend to the feed — the grid will light up from real data.
        </p>
      )}
    </div>
  );
}

export function CalendarWeekStrip({
  calendarMonth,
  events,
  weekIndex,
  onWeekChange,
}: {
  calendarMonth: CalendarMonthMeta;
  events: PropertyCalendarEvent[];
  weekIndex: number;
  onWeekChange: (i: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const rows = useMemo(
    () => monthWeekRows(calendarMonth.leadingBlanks, calendarMonth.daysInMonth),
    [calendarMonth.leadingBlanks, calendarMonth.daysInMonth]
  );
  const safeIdx = Math.max(0, Math.min(weekIndex, rows.length - 1));
  const row = rows[safeIdx] ?? rows[0];

  const touchStart = useRef(0);

  return (
    <div className={cn(surface, "min-w-0 max-w-full p-3 sm:p-5")}>
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 text-sm font-semibold text-foreground">Week at a glance</p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="flex size-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/65 bg-secondary/85 text-muted-foreground touch-manipulation hover:text-foreground disabled:opacity-30 sm:size-10 sm:min-h-0 sm:min-w-0 dark:border-white/10 dark:bg-white/[0.04]"
            disabled={safeIdx <= 0}
            onClick={() => onWeekChange(safeIdx - 1)}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="flex size-11 min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/65 bg-secondary/85 text-muted-foreground touch-manipulation hover:text-foreground disabled:opacity-30 sm:size-10 sm:min-h-0 sm:min-w-0 dark:border-white/10 dark:bg-white/[0.04]"
            disabled={safeIdx >= rows.length - 1}
            onClick={() => onWeekChange(safeIdx + 1)}
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div
        className="touch-pan-y"
        onTouchStart={(e) => {
          touchStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchStart.current;
          if (dx < -40) onWeekChange(Math.min(rows.length - 1, safeIdx + 1));
          if (dx > 40) onWeekChange(Math.max(0, safeIdx - 1));
        }}
      >
        <div className="min-w-0 space-y-2 md:hidden">
          {row.map((day, i) => {
            const label = weekdayLabels[i];
            if (day === null) {
              return (
                <div
                  key={i}
                  className="min-h-10 rounded-2xl border border-dashed border-border/50 bg-muted/35 dark:border-white/8 dark:bg-white/[0.02]"
                />
              );
            }
            const dayEv = eventsForDay(day, events);
            return (
              <motion.div
                key={day}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="ar-surface-inset flex min-h-[4.5rem] flex-col rounded-2xl p-3"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                  <p className="font-heading text-xl font-semibold tabular-nums text-foreground">{day}</p>
                </div>
                <div className="mt-2 min-h-0 flex-1 space-y-1.5">
                  {dayEv.map((ev) => (
                    <div
                      key={ev.id}
                      className="truncate rounded-lg border border-border/55 bg-card/85 px-2 py-1.5 text-[11px] text-muted-foreground dark:border-white/10 dark:bg-white/[0.05]"
                      title={ev.title}
                    >
                      <span className={cn("mr-1 inline-block size-1.5 rounded-full align-middle", accentDot[ev.accent])} />
                      {ev.title}
                    </div>
                  ))}
                  {dayEv.length === 0 && <p className="text-[11px] text-muted-foreground/70">Open</p>}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="hidden min-w-0 md:block">
          <div className="grid min-w-0 grid-cols-7 gap-1.5 sm:gap-2">
            {row.map((day, i) => {
              const label = weekdayLabels[i];
              if (day === null) {
                return (
                  <div
                    key={i}
                    className="min-h-[5.5rem] rounded-2xl border border-dashed border-border/50 bg-muted/30 sm:min-h-[7.5rem] dark:border-white/8 dark:bg-white/[0.02]"
                  />
                );
              }
              const dayEv = eventsForDay(day, events);
              return (
                <motion.div
                  key={day}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="ar-surface-inset flex min-h-[5.5rem] min-w-0 flex-col rounded-2xl p-2 sm:min-h-[7.5rem] sm:p-2.5"
                >
                  <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
                  <p className="font-heading text-base font-semibold tabular-nums text-foreground sm:text-lg">{day}</p>
                  <div className="mt-1.5 min-h-0 flex-1 space-y-1 overflow-hidden sm:mt-2">
                    {dayEv.map((ev) => (
                      <div
                        key={ev.id}
                        className="truncate rounded-lg border border-border/55 bg-card/85 px-1.5 py-1 text-[9px] text-muted-foreground sm:text-[9px] dark:border-white/10 dark:bg-white/[0.05]"
                        title={ev.title}
                      >
                        <span className={cn("mr-1 inline-block size-1.5 rounded-full align-middle", accentDot[ev.accent])} />
                        {ev.title}
                      </div>
                    ))}
                    {dayEv.length === 0 && <p className="text-[9px] text-muted-foreground/70">Open</p>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarAgendaList({
  events,
  monthLabel,
}: {
  events: PropertyCalendarEvent[];
  monthLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const monthName = monthLabel.split(" ")[0] ?? "Month";
  const rows = agendaRows(events, monthName);
  return (
    <div className={cn(surface, "min-w-0 max-w-full divide-y divide-border/45 dark:divide-white/10")}>
      <div className="min-w-0 px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-foreground">{monthLabel} agenda</p>
        <p className="text-[11px] text-muted-foreground">Scrollable list · same data as month dots</p>
      </div>
      <div className="max-h-[min(55dvh,420px)] min-h-0 overflow-y-auto overscroll-contain sm:max-h-[520px]">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
            Nothing scheduled this month. When bookings land in the calendar, they appear here in order.
          </p>
        ) : (
          rows.map((ev, idx) => (
            <motion.div
              key={ev.id}
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-5%" }}
              transition={{ delay: Math.min(idx * 0.03, 0.24) }}
              className="flex min-h-[3.25rem] gap-2 px-4 py-3 sm:min-h-0 sm:gap-3 sm:px-5 sm:py-3.5"
            >
              <div className="flex w-[4.5rem] shrink-0 flex-col sm:w-24">
                <span className="text-[11px] font-medium text-muted-foreground">{ev.rangeLabel}</span>
                {ev.timeLabel && <span className="text-[10px] text-muted-foreground/80">{ev.timeLabel}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{ev.title}</p>
                <p className="text-[11px] capitalize text-muted-foreground">{ev.kind.replace(/_/g, " ")}</p>
                {ev.attendeeLabels.length > 0 && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{ev.attendeeLabels.join(", ")}</p>
                )}
              </div>
              <span className={cn("mt-1 size-2 shrink-0 rounded-full", accentDot[ev.accent])} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
