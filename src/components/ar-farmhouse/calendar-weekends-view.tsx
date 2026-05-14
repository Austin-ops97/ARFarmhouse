"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, CloudSun, Home, MessageCircle, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  demoCalendarMonth,
  demoUpcomingStay,
  demoWeekendEvents,
  type DemoWeekendEvent,
} from "@/lib/social-demo";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"] as const;

function useNowInterval(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [enabled]);
  return now;
}

function countdownParts(targetMs: number, now: number) {
  const diff = targetMs - now;
  if (diff <= 0) return { line: "Now", sub: "Moments away" };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return { line: `${days}d ${hours}h`, sub: "Until kickoff" };
  const mins = Math.floor((diff % 3600000) / 60000);
  return { line: `${hours}h ${mins}m`, sub: "Closing in" };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

function EventCard({ event }: { event: DemoWeekendEvent }) {
  const reduceMotion = useReducedMotion();
  const now = useNowInterval(true);
  const target = Date.parse(event.startIso);
  const cd = useMemo(() => countdownParts(target, now), [target, now]);
  const [rsvp, setRsvp] = useState(event.rsvp);

  const rsvpLabel = rsvp === "going" ? "Going" : rsvp === "maybe" ? "Maybe" : "RSVP";

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: reduceMotion ? 0.2 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      className={cn(surface, "touch-manipulation overflow-hidden")}
    >
      <div className="relative h-44 sm:h-52">
        <Image src={event.hero} alt="" fill className="object-cover" sizes="(min-width: 1024px) 480px, 100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/15 bg-background/55 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur-md">
            {event.dateLabel}
          </span>
          <span className="rounded-full border border-primary/25 bg-primary/15 px-2.5 py-1 text-[10px] font-medium text-primary-foreground backdrop-blur-md">
            {cd.line}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{event.title}</p>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{event.tagline}</p>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CloudSun className="size-4 text-mist" aria-hidden />
            <span>
              {event.weather.highF}° / {event.weather.lowF}° · {event.weather.label}
            </span>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">{cd.sub}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex -space-x-2.5">
            {event.attendees.slice(0, 4).map((a) => (
              <Avatar key={a.name} className="ring-2 ring-background/90" size="lg">
                <AvatarImage src={a.avatar} alt="" />
                <AvatarFallback>{initials(a.name)}</AvatarFallback>
              </Avatar>
            ))}
            {event.attendeeExtra > 0 && (
              <div className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-[11px] font-medium text-muted-foreground ring-2 ring-background/90">
                +{event.attendeeExtra}
              </div>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant={rsvp === "going" ? "default" : "outline"}
            className="rounded-xl"
            onClick={() =>
              setRsvp((prev) => (prev === "going" ? "maybe" : prev === "maybe" ? "invite" : "going"))
            }
          >
            {rsvpLabel}
          </Button>
        </div>

        <Separator className="bg-white/10" />

        <ul className="space-y-2 text-sm text-muted-foreground">
          {event.quickDetails.map((d) => (
            <li key={d} className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>{d}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Comments preview</p>
          <div className="mt-2 space-y-2">
            {event.commentsPreview.map((c) => (
              <p key={`${c.author}-${c.text}`} className="text-[13px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{c.author}</span> {c.text}
              </p>
            ))}
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline"
          >
            <MessageCircle className="size-3.5" aria-hidden />
            Open thread
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export function CalendarWeekendsView() {
  const reduceMotion = useReducedMotion();
  const dayMap = useMemo(() => new Map(demoCalendarMonth.days.map((d) => [d.day, d])), []);

  const cells = useMemo(() => {
    const out: ({ type: "blank" } | { type: "day"; day: number })[] = [];
    for (let i = 0; i < demoCalendarMonth.leadingBlanks; i++) out.push({ type: "blank" });
    for (let d = 1; d <= demoCalendarMonth.daysInMonth; d++) out.push({ type: "day", day: d });
    while (out.length % 7 !== 0) out.push({ type: "blank" });
    return out;
  }, []);

  const statusStyles: Record<string, string> = {
    open: "border-white/8 bg-white/[0.03] text-muted-foreground hover:border-white/16",
    booked: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100/90",
    busy: "border-amber-300/25 bg-amber-400/10 text-amber-50/90",
    checkout: "border-sky-400/25 bg-sky-500/10 text-sky-50/90",
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={cn(surface, "p-5 sm:p-6")}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              Weekends & stays
            </div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Coordinate like a retreat, not a meeting.
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              RSVP in plain language, see who&apos;s drifting in, and keep the calendar breathable — booking logic comes
              later; this is the emotional rehearsal.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground">
              <Home className="size-4 text-primary" aria-hidden />
              AR Farmhouse
            </span>
            <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-muted-foreground">
              <Users className="size-4 text-mist" aria-hidden />
              Family-first holds
            </span>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground">Upcoming weekends</h3>
            <span className="text-[11px] text-muted-foreground">Tap RSVP · demo only</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {demoWeekendEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className={cn(surface, "p-5")}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                  <CalendarDays className="size-5 text-primary" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Booking preview</p>
                  <p className="text-xs text-muted-foreground">{demoCalendarMonth.label}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
              {weekdayLabels.map((w, i) => (
                <span key={`${w}-${i}`} className="py-1">
                  {w}
                </span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((cell, idx) => {
                if (cell.type === "blank") {
                  return <div key={`b-${idx}`} className="aspect-square rounded-xl bg-transparent" />;
                }
                const info = dayMap.get(cell.day);
                const st = info?.status ?? "open";
                const isToday = cell.day === 14;
                return (
                  <motion.div
                    key={cell.day}
                    whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                    className={cn(
                      "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-xs font-medium transition-colors",
                      statusStyles[st] ?? statusStyles.open,
                      isToday && "ring-2 ring-primary/50"
                    )}
                  >
                    <span className={cn("text-[13px]", isToday && "text-primary")}>{cell.day}</span>
                    {info?.guests && (
                      <span className="absolute bottom-1 left-0 right-0 truncate px-0.5 text-[8px] font-medium text-muted-foreground">
                        {info.guests[0]}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            <Separator className="my-5 bg-white/10" />

            <p className="text-[11px] font-medium text-muted-foreground">Busy weekends</p>
            <div className="mt-3 space-y-2">
              {demoCalendarMonth.busyWeekends.map((w) => (
                <div
                  key={w.range}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{w.title}</p>
                    <p className="text-[10px] text-muted-foreground">{w.range}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      w.tone === "booked"
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90"
                        : "border-amber-300/30 bg-amber-400/10 text-amber-50/90"
                    )}
                  >
                    {w.occupancy}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={cn(surface, "p-5")}>
            <p className="text-xs font-medium text-muted-foreground">Upcoming stay summary</p>
            <p className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground">{demoUpcomingStay.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{demoUpcomingStay.dates}</p>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <span className="text-xs text-muted-foreground">Guests</span>
              <span className="text-sm font-medium text-foreground">{demoUpcomingStay.guests}</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{demoUpcomingStay.notes}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
