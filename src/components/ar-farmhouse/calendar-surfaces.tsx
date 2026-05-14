"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Rows3 } from "lucide-react";
import { useMemo, useRef } from "react";

import type { DemoCoordEvent } from "@/lib/calendar-demo";
import { demoCalendarMonth, type DemoCalendarDay } from "@/lib/social-demo";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"] as const;

export type CalendarSurfaceMode = "month" | "week" | "agenda";

const accentDot: Record<DemoCoordEvent["accent"], string> = {
  mint: "bg-emerald-400/80",
  amber: "bg-amber-300/85",
  rose: "bg-rose-400/80",
  sky: "bg-sky-400/80",
  violet: "bg-violet-400/75",
  slate: "bg-zinc-400/70",
  emerald: "bg-emerald-300/85",
};

function eventsForDay(day: number, events: DemoCoordEvent[]) {
  return events.filter((e) => {
    const end = e.endDay ?? e.startDay;
    return day >= e.startDay && day <= end;
  });
}

function agendaRows(events: DemoCoordEvent[]) {
  const sorted = [...events].sort((a, b) => a.startDay - b.startDay || a.title.localeCompare(b.title));
  return sorted.map((e) => ({
    ...e,
    rangeLabel:
      e.endDay && e.endDay !== e.startDay ? `May ${e.startDay}–${e.endDay}` : `May ${e.startDay}`,
  }));
}

/** Weeks as rows of 7 cells (day number or null) for May 2026 grid */
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
    <div className="flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
      {tabs.map((t) => {
        const active = mode === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onModeChange(t.id)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium transition-colors sm:text-sm",
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
  dayMap: Map<number, DemoCalendarDay>;
  statusStyles: Record<string, string>;
  events: DemoCoordEvent[];
  onDayHover?: (day: number | null) => void;
  previewDay: number | null;
};

export function CalendarMonthBoard({
  dayMap,
  statusStyles,
  events,
  onDayHover,
  previewDay,
}: CalendarMonthBoardProps) {
  const reduceMotion = useReducedMotion();
  const rows = useMemo(
    () => monthWeekRows(demoCalendarMonth.leadingBlanks, demoCalendarMonth.daysInMonth),
    []
  );

  return (
      <div className={cn(surface, "p-3 sm:p-5")}>
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
        <p className="font-heading text-base font-semibold text-foreground sm:text-lg">{demoCalendarMonth.label}</p>
        <span className="hidden text-[11px] text-muted-foreground sm:inline">Swipe week row on mobile</span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-muted-foreground sm:gap-1 sm:text-[11px]">
        {weekdayLabels.map((w, i) => (
          <span key={`${w}-${i}`} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div className="mt-1.5 space-y-0.5 sm:mt-2 sm:space-y-1">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {row.map((day, ci) => {
              if (day === null) {
                return <div key={`e-${ri}-${ci}`} className="aspect-square rounded-xl bg-transparent" />;
              }
              const info = dayMap.get(day);
              const st = info?.status ?? "open";
              const isToday = day === 14;
              const dayEvents = eventsForDay(day, events);
              const preview = previewDay === day;
              return (
                <motion.div
                  key={day}
                  layout={false}
                  onMouseEnter={() => onDayHover?.(day)}
                  onMouseLeave={() => onDayHover?.(null)}
                  whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-[10px] font-medium transition-colors sm:rounded-xl sm:text-[11px]",
                    statusStyles[st] ?? statusStyles.open,
                    isToday && "ring-2 ring-primary/45",
                    preview && "ring-1 ring-sky-400/50"
                  )}
                >
                  <span className={cn("text-[11px] sm:text-[12px]", isToday && "text-primary")}>{day}</span>
                  <div className="mt-1 flex max-w-[92%] flex-wrap justify-center gap-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span key={ev.id} className={cn("size-1.5 rounded-full", accentDot[ev.accent])} title={ev.title} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] font-medium text-muted-foreground">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                  {info?.guests?.[0] && (
                    <span className="absolute bottom-1 left-0 right-0 truncate px-0.5 text-[7px] font-medium text-muted-foreground/90">
                      {info.guests[0]}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarWeekStrip({
  events,
  weekIndex,
  onWeekChange,
}: {
  events: DemoCoordEvent[];
  weekIndex: number;
  onWeekChange: (i: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const rows = useMemo(
    () => monthWeekRows(demoCalendarMonth.leadingBlanks, demoCalendarMonth.daysInMonth),
    []
  );
  const safeIdx = Math.max(0, Math.min(weekIndex, rows.length - 1));
  const row = rows[safeIdx] ?? rows[0];

  const touchStart = useRef(0);

  return (
    <div className={cn(surface, "p-4 sm:p-5")}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Week at a glance</p>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
            disabled={safeIdx <= 0}
            onClick={() => onWeekChange(safeIdx - 1)}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
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
        <div className="grid grid-cols-7 gap-2">
          {row.map((day, i) => {
            const label = weekdayLabels[i];
            if (day === null) {
              return (
                <div key={i} className="min-h-[120px] rounded-2xl border border-dashed border-white/8 bg-white/[0.02]" />
              );
            }
            const dayEv = eventsForDay(day, events);
            return (
              <motion.div
                key={day}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex min-h-[120px] flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-2"
              >
                <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
                <p className="font-heading text-lg font-semibold text-foreground">{day}</p>
                <div className="mt-2 flex-1 space-y-1 overflow-hidden">
                  {dayEv.map((ev) => (
                    <div
                      key={ev.id}
                      className="truncate rounded-lg border border-white/10 bg-white/[0.05] px-1.5 py-1 text-[9px] text-muted-foreground"
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
  );
}

export function CalendarAgendaList({ events }: { events: DemoCoordEvent[] }) {
  const reduceMotion = useReducedMotion();
  const rows = agendaRows(events);
  return (
    <div className={cn(surface, "divide-y divide-white/10")}>
      <div className="px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-foreground">May agenda</p>
        <p className="text-[11px] text-muted-foreground">Scrollable list · same data as month dots</p>
      </div>
      <div className="max-h-[420px] overflow-y-auto overscroll-contain sm:max-h-[520px]">
        {rows.map((ev, idx) => (
          <motion.div
            key={ev.id}
            initial={reduceMotion ? false : { opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-5%" }}
            transition={{ delay: Math.min(idx * 0.03, 0.24) }}
            className="flex gap-3 px-4 py-3.5 sm:px-5"
          >
            <div className="flex w-24 shrink-0 flex-col">
              <span className="text-[11px] font-medium text-muted-foreground">{ev.rangeLabel}</span>
              {ev.timeLabel && <span className="text-[10px] text-muted-foreground/80">{ev.timeLabel}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{ev.title}</p>
              <p className="text-[11px] capitalize text-muted-foreground">{ev.kind.replace(/_/g, " ")}</p>
            </div>
            <span className={cn("mt-1 size-2 shrink-0 rounded-full", accentDot[ev.accent])} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
