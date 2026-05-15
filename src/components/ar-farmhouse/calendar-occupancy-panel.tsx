"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Home, Users } from "lucide-react";

import type { CalendarMonthMeta } from "@/lib/calendar-month-meta";
import { cn } from "@/lib/utils";

const surface = cn("ar-surface-raised relative overflow-hidden rounded-[1.35rem]");

const heatClass: Record<0 | 1 | 2 | 3, string> = {
  0: "bg-muted/70 dark:bg-white/[0.06]",
  1: "bg-emerald-500/25",
  2: "bg-amber-400/28",
  3: "bg-rose-500/30",
};

type CalendarOccupancyPanelProps = {
  calendarMonth: CalendarMonthMeta;
};

export function CalendarOccupancyPanel({ calendarMonth }: CalendarOccupancyPanelProps) {
  const reduceMotion = useReducedMotion();
  const days = Array.from({ length: calendarMonth.daysInMonth }, (_, i) => i + 1);
  const today = calendarMonth.todayDay;
  const windowStart = Math.max(1, (today ?? 1) - 3);
  const windowDays = Array.from({ length: 7 }, (_, i) => windowStart + i).filter((d) => d <= calendarMonth.daysInMonth);
  const monthWord = calendarMonth.label.split(" ")[0] ?? "Month";

  return (
    <div className="min-w-0 space-y-4">
      <div className={cn(surface, "min-w-0 max-w-full p-4 sm:p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-border/55 bg-muted/50 dark:border-white/10 dark:bg-white/[0.05]">
              <Home className="size-5 text-primary" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Occupancy pulse</p>
              <p className="text-[11px] text-muted-foreground">Who&apos;s here · who&apos;s en route</p>
            </div>
          </div>
        </div>

        <div className="mt-5 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">{calendarMonth.label} · calm view</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/90">
            Density heat will reflect real bookings. Until then, every day reads open — the rhythm you want before the
            house fills.
          </p>
          <div className="mt-3 grid w-full min-w-0 grid-cols-[repeat(31,minmax(0,1fr))] gap-px">
            {days.map((d) => {
              const level = 0 as 0 | 1 | 2 | 3;
              const isToday = today !== null && d === today;
              return (
                <motion.div
                  key={d}
                  initial={reduceMotion ? false : { scaleY: 0.4, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{ delay: Math.min(d * 0.008, 0.2) }}
                  title={`${monthWord} ${d}`}
                  className={cn(
                    "h-9 min-w-0 rounded-sm border border-border/40 dark:border-white/[0.06] sm:h-11 sm:rounded-md",
                    heatClass[level],
                    isToday && "ring-1 ring-primary/50"
                  )}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
            <span>1</span>
            <span>{calendarMonth.daysInMonth}</span>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-medium text-muted-foreground">Week window</p>
          <div className="mt-3 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {windowDays.map((d) => {
              const level = 0 as 0 | 1 | 2 | 3;
              const label = "Open";
              return (
                <div
                  key={d}
                  className="ar-nested-well flex min-w-[72px] flex-1 flex-col rounded-2xl px-2 py-2 text-center"
                >
                  <span className="text-[10px] text-muted-foreground">
                    {monthWord} {d}
                  </span>
                  <span className="mt-1 text-[11px] font-semibold text-foreground">{label}</span>
                  <span className={cn("mx-auto mt-1 h-1.5 w-8 rounded-full", heatClass[level])} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <div className={cn(surface, "min-w-0 p-4 sm:p-5")}>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Users className="size-3.5 text-primary" aria-hidden />
            On property now
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            No one flagged as on-property yet. When guest lists sync from your calendar, faces and checkout times land
            here quietly.
          </p>
        </div>

        <div className={cn(surface, "min-w-0 p-4 sm:p-5")}>
          <p className="text-xs font-medium text-muted-foreground">Upcoming arrivals</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Staggered ETAs will appear when weekends are scheduled. Until then, the lane stays clear.
          </p>
        </div>
      </div>

      <div className={cn(surface, "min-w-0 p-4 sm:p-5")}>
        <p className="text-xs font-medium text-muted-foreground">Checkout & turnover</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Turnover windows show after stays are booked — linen runs, propane checks, and soft checkouts stay in one
          column.
        </p>
      </div>
    </div>
  );
}
