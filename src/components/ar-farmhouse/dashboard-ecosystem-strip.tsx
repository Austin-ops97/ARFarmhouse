"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarRange, Home, Sparkles } from "lucide-react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.25rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_20px_60px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

export function DashboardEcosystemStrip() {
  const reduceMotion = useReducedMotion();
  const { openWeekendHub, goTo } = useEcosystem();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className={cn(surface, "flex flex-col justify-between gap-4 p-4 sm:p-5")}>
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-primary/90">
            <Sparkles className="size-3" aria-hidden />
            This weekend
          </div>
          <p className="mt-3 font-heading text-lg font-semibold tracking-tight text-foreground">Family command center</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            One surface for arrivals, groceries, guide picks, and the quiet pulse of the property.
          </p>
        </div>
        <Button type="button" className="w-full rounded-xl sm:w-auto" onClick={() => openWeekendHub("current")}>
          Open weekend hub
          <ArrowRight className="size-4 opacity-80" data-icon="inline-end" />
        </Button>
      </div>

      <div className={cn(surface, "flex flex-col gap-3 p-4 sm:p-5")}>
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <CalendarRange className="size-3.5 text-primary" aria-hidden />
          Feed × calendar
        </div>
        <p className="text-sm text-muted-foreground">
          Nothing bridged yet. When posts reference a booked weekend, a short line appears here with a path into the hub.
        </p>
        <div className="mt-auto flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => goTo("feed")}>
            Open feed
          </Button>
          <Button type="button" variant="ghost" size="sm" className="rounded-xl text-muted-foreground" onClick={() => goTo("calendar")}>
            Calendar
          </Button>
        </div>
      </div>

      <div className={cn(surface, "flex flex-col gap-3 p-4 sm:p-5 sm:col-span-2 lg:col-span-1")}>
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <Home className="size-3.5 text-primary" aria-hidden />
          Property awareness
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">
          Live gates, climate, and trail summaries will connect here. Until integrations land, keep quick checks in the
          feed so everyone signed in stays aligned.
        </p>
        <Button type="button" variant="outline" size="sm" className="mt-auto w-fit rounded-xl" onClick={() => goTo("property")}>
          Property hub
          <ArrowRight className="size-4 opacity-70" data-icon="inline-end" />
        </Button>
      </div>
    </motion.section>
  );
}
