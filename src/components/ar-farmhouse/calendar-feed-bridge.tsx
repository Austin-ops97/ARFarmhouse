"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ImageIcon, Link2, PartyPopper } from "lucide-react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

const kindIcon = {
  booking: PartyPopper,
  recap: ImageIcon,
  rsvp: Link2,
} as const;

export function CalendarFeedBridge() {
  const reduceMotion = useReducedMotion();
  const { openWeekendHub, goTo } = useEcosystem();
  return (
    <div className={cn(surface, "min-w-0 max-w-full p-4 sm:p-6")}>
      <p className="text-xs font-medium uppercase tracking-wide text-primary/90">Feed × calendar</p>
      <h3 className="mt-1 font-heading text-lg font-semibold tracking-tight text-foreground">What the house already knows</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Planning stays woven with posts — bookings, RSVPs, and albums surface together.
      </p>
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">No linked feed moments yet</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          When posts mention weekends or bookings, quick bridges to the hub show up here for everyone signed in.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => goTo("feed")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-white/20"
          >
            <motion.span
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2"
            >
              Open feed
              <ImageIcon className="size-4 text-primary/80" aria-hidden />
            </motion.span>
          </button>
          <button
            type="button"
            onClick={() => openWeekendHub("current")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-white/20"
          >
            Weekend hub
            <PartyPopper className="size-4 text-primary/80" aria-hidden />
          </button>
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/80">
          <Link2 className="size-3.5 shrink-0" aria-hidden />
          RSVPs and headcount will mirror here from real posts and calendar rows.
        </p>
      </div>
    </div>
  );
}
