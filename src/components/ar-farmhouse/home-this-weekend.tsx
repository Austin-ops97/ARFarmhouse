"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Clock3, UtensilsCrossed, Users } from "lucide-react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Button } from "@/components/ui/button";
import { demoMealPlan, demoThisWeekend, demoWeekendActivities } from "@/lib/calendar-demo";
import { mockWeekendGuests } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function useWeekendCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    const ms = Math.max(0, target.getTime() - now);
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return { days, hours, minutes, seconds, ms };
  }, [now, target]);
}

/** Demo anchor: first full gathering moment of the May family weekend */
const WEEKEND_ANCHOR = new Date(2026, 4, 16, 15, 0, 0);

export function HomeThisWeekend() {
  const reduceMotion = useReducedMotion();
  const { openWeekendHub } = useEcosystem();
  const countdown = useWeekendCountdown(WEEKEND_ANCHOR);

  const tiles = [
    { label: "Days", value: countdown.days },
    { label: "Hrs", value: countdown.hours },
    { label: "Min", value: countdown.minutes },
    { label: "Sec", value: countdown.seconds },
  ];

  return (
    <section className="relative">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">This weekend</p>
          <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {demoThisWeekend.title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{demoThisWeekend.dateLabel}</p>
        </div>
        <Button type="button" variant="outline" className="w-fit rounded-full border-border/55 bg-card/70 dark:border-white/10 dark:bg-white/[0.03]" onClick={() => openWeekendHub("current")}>
          Open hub
        </Button>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-3xl ring-1 ring-white/[0.06]">
            <div className="absolute inset-0">
              <Image
                src={demoThisWeekend.hero}
                alt=""
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 640px, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
            </div>
            <div className="relative space-y-6 p-6 sm:p-8">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white">
                <Clock3 className="size-4 text-mist" aria-hidden />
                Countdown to first arrivals
              </div>
              <div className="grid grid-cols-4 gap-3">
                {tiles.map((t) => (
                  <div
                    key={t.label}
                    className="rounded-2xl bg-white/12 px-2 py-3 text-center ring-1 ring-white/18 backdrop-blur-md"
                  >
                    <p className="font-heading text-2xl font-semibold tabular-nums text-white sm:text-3xl">{t.value}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/90">{t.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium text-white/92">{demoThisWeekend.weather.label}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 ring-1 ring-white/[0.06]">
              <Users className="size-4 text-primary/90" aria-hidden />
              {mockWeekendGuests.length} early arrivals tracked
            </span>
            <span className="text-white/25">·</span>
            <span>{demoThisWeekend.occupancySummary}</span>
          </div>
        </div>

        <div className="space-y-10">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">Meals</p>
            <ul className="mt-4 space-y-4">
              {demoMealPlan.slice(0, 3).map((meal) => (
                <motion.li
                  key={meal.meal}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10%" }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-4 border-b border-white/[0.06] pb-4 last:border-0 last:pb-0"
                >
                  <span className="mt-0.5 flex size-9 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.06]">
                    <UtensilsCrossed className="size-4 text-primary/85" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{meal.meal}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {meal.chef} · {meal.dish}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">On the calendar</p>
            <div className="mt-4 space-y-3">
              {demoWeekendActivities.slice(0, 2).map((act) => (
                <div key={act.title} className={cn("rounded-2xl bg-white/[0.02] px-4 py-3 ring-1 ring-white/[0.05]")}>
                  <p className="text-sm font-medium text-foreground">{act.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {act.when} · {act.people.join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">{demoThisWeekend.notes}</p>
        </div>
      </div>
    </section>
  );
}
