"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarRange, Clock3, UtensilsCrossed } from "lucide-react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Button } from "@/components/ui/button";
import { getWeekendHubBundle } from "@/lib/weekend-hub-bundle";
import { cn } from "@/lib/utils";

export function HomeThisWeekend() {
  const reduceMotion = useReducedMotion();
  const { openWeekendHub } = useEcosystem();
  const bundle = getWeekendHubBundle("current");

  return (
    <section className="relative">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">This weekend</p>
          <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {bundle.title}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{bundle.dateLabel}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-fit rounded-full border-border/55 bg-card/70 dark:border-white/10 dark:bg-white/[0.03]"
          onClick={() => openWeekendHub("current")}
        >
          Open hub
        </Button>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-3xl ring-1 ring-white/[0.06]">
            <div className="absolute inset-0">
              <Image
                src={bundle.hero}
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
                Weekend planning
              </div>
              <div className="rounded-2xl bg-white/12 px-4 py-5 ring-1 ring-white/18 backdrop-blur-md">
                <p className="text-sm leading-relaxed text-white/92">
                  No countdown yet — when a stay has a start time, a quiet timer appears here for everyone signed in.
                </p>
              </div>
              <p className="text-sm font-medium text-white/92">{bundle.weather.label}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 ring-1 ring-white/[0.06]">
              <CalendarRange className="size-4 text-primary/90" aria-hidden />
              Calendar drives this block
            </span>
          </div>
        </div>

        <div className="space-y-10">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">Meals</p>
            <ul className="mt-4 space-y-4">
              {bundle.mealPlan.length === 0 ? (
                <li className="border-b border-white/[0.06] pb-4 text-sm text-muted-foreground">
                  No meals planned yet. The hub will hold menus when your family adds them.
                </li>
              ) : (
                bundle.mealPlan.slice(0, 3).map((meal) => (
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
                ))
              )}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">On the calendar</p>
            <div className="mt-4 space-y-3">
              {bundle.activities.length === 0 ? (
                <div className={cn("rounded-2xl bg-white/[0.02] px-4 py-3 ring-1 ring-white/[0.05]")}>
                  <p className="text-sm text-muted-foreground">No activities scheduled — the day stays open.</p>
                </div>
              ) : (
                bundle.activities.slice(0, 2).map((act) => (
                  <div key={act.title} className={cn("rounded-2xl bg-white/[0.02] px-4 py-3 ring-1 ring-white/[0.05]")}>
                    <p className="text-sm font-medium text-foreground">{act.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {act.when} · {act.people.join(", ")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {bundle.notes && <p className="text-sm leading-relaxed text-muted-foreground">{bundle.notes}</p>}
        </div>
      </div>
    </section>
  );
}
