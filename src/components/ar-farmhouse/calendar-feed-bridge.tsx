"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ImageIcon, Link2, PartyPopper } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { demoFeedCalendarBridge } from "@/lib/calendar-demo";
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

const kindIcon = {
  booking: PartyPopper,
  recap: ImageIcon,
  rsvp: Link2,
} as const;

export function CalendarFeedBridge() {
  const reduceMotion = useReducedMotion();
  return (
    <div className={cn(surface, "p-5 sm:p-6")}>
      <p className="text-xs font-medium uppercase tracking-wide text-primary/90">Feed × calendar</p>
      <h3 className="mt-1 font-heading text-lg font-semibold tracking-tight text-foreground">What the house already knows</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Planning stays woven with posts — bookings, RSVPs, and albums surface together.
      </p>
      <ul className="mt-5 space-y-3">
        {demoFeedCalendarBridge.map((row, idx) => {
          const Icon = kindIcon[row.kind];
          return (
            <motion.li
              key={row.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3"
            >
              <Avatar size="default" className="shrink-0 ring-2 ring-background/80">
                <AvatarImage src={row.avatar} alt="" />
                <AvatarFallback>{initials(row.actor)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="size-3.5 text-primary/80" aria-hidden />
                  <p className="text-[11px] text-muted-foreground">{row.timeLabel}</p>
                </div>
                <p className="mt-1 text-sm text-foreground">
                  <span className="font-semibold">{row.actor}</span>{" "}
                  <span className="text-muted-foreground">{row.action}</span>
                </p>
                <p className="mt-0.5 text-[12px] text-primary/90">{row.detail}</p>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
