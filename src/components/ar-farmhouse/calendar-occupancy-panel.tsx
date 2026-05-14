"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Home, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  demoCurrentGuests,
  demoDepartureSchedule,
  demoOccupancyByDay,
  demoUpcomingArrivals,
} from "@/lib/calendar-demo";
import { demoCalendarMonth } from "@/lib/social-demo";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

const heatClass: Record<0 | 1 | 2 | 3, string> = {
  0: "bg-white/[0.06]",
  1: "bg-emerald-500/25",
  2: "bg-amber-400/28",
  3: "bg-rose-500/30",
};

export function CalendarOccupancyPanel() {
  const reduceMotion = useReducedMotion();
  const days = Array.from({ length: demoCalendarMonth.daysInMonth }, (_, i) => i + 1);
  const windowDays = [14, 15, 16, 17, 18, 19, 20];

  return (
    <div className="min-w-0 space-y-4">
      <div className={cn(surface, "min-w-0 max-w-full p-4 sm:p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Home className="size-5 text-primary" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Occupancy pulse</p>
              <p className="text-[11px] text-muted-foreground">Who&apos;s here · who&apos;s en route</p>
            </div>
          </div>
        </div>

        <div className="mt-5 min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground">May density</p>
          <div className="mt-2 grid w-full min-w-0 grid-cols-[repeat(31,minmax(0,1fr))] gap-px">
            {days.map((d) => {
              const level = demoOccupancyByDay[d] ?? 0;
              const isToday = d === 14;
              return (
                <motion.div
                  key={d}
                  initial={reduceMotion ? false : { scaleY: 0.4, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{ delay: Math.min(d * 0.008, 0.2) }}
                  title={`May ${d}`}
                  className={cn(
                    "h-9 min-w-0 rounded-sm border border-white/[0.06] sm:h-11 sm:rounded-md",
                    heatClass[level],
                    isToday && "ring-1 ring-primary/50"
                  )}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
            <span>1</span>
            <span>31</span>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[11px] font-medium text-muted-foreground">Mid-May corridor</p>
          <div className="mt-3 flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {windowDays.map((d) => {
              const level = demoOccupancyByDay[d as keyof typeof demoOccupancyByDay] ?? 0;
              const label = level === 0 ? "Open" : level === 1 ? "Light" : level === 2 ? "Busy" : "Full";
              return (
                <div
                  key={d}
                  className="flex min-w-[72px] flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-2 text-center"
                >
                  <span className="text-[10px] text-muted-foreground">May {d}</span>
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
          <ul className="mt-3 space-y-2">
            {demoCurrentGuests.map((g) => (
              <li key={g.name} className="flex items-center gap-3">
                <Avatar size="default">
                  <AvatarImage src={g.avatar} alt="" />
                  <AvatarFallback>{initials(g.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{g.name}</p>
                  <p className="text-[11px] text-muted-foreground">{g.until}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={cn(surface, "min-w-0 p-4 sm:p-5")}>
          <ul className="mt-3 space-y-2">
            {demoUpcomingArrivals.map((g) => (
              <li key={g.name} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <Avatar size="default" className="shrink-0">
                  <AvatarImage src={g.avatar} alt="" />
                  <AvatarFallback>{initials(g.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{g.name}</p>
                  <p className="text-[11px] text-muted-foreground">{g.when}</p>
                  <p className="text-[11px] text-primary/90">{g.note}</p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground/50" aria-hidden />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={cn(surface, "min-w-0 p-4 sm:p-5")}>
        <p className="text-xs font-medium text-muted-foreground">Checkout & turnover</p>
        <div className="mt-3 space-y-2">
          {demoDepartureSchedule.map((d) => (
            <div key={d.range} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">{d.label}</p>
                <p className="text-[11px] text-muted-foreground">{d.range}</p>
              </div>
              <span className="shrink-0 rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {d.count} people
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
