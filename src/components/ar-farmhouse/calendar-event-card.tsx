"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { CloudSun, MessageCircle, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { DemoWeekendEvent } from "@/lib/social-demo";
import { cn } from "@/lib/utils";

const surface = cn("ar-surface-raised rounded-[1.35rem]");

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

export function CalendarEventCard({
  event,
  onOpenWeekendHub,
}: {
  event: DemoWeekendEvent;
  onOpenWeekendHub?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const target = Date.parse(event.startIso);
  const cd = useMemo(() => countdownParts(target, now), [target, now]);
  const [rsvp, setRsvp] = useState(event.rsvp);
  const [joined, setJoined] = useState(false);
  const [rx, setRx] = useState<Record<string, boolean>>({});

  const rsvpLabel = rsvp === "going" ? "Going" : rsvp === "maybe" ? "Maybe" : "RSVP";

  const toggleRx = (emoji: string) => {
    setRx((p) => ({ ...p, [emoji]: !p[emoji] }));
  };

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: reduceMotion ? 0.2 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      className={cn(surface, "min-w-0 max-w-full touch-manipulation overflow-hidden")}
    >
      <div className="relative h-44 sm:h-52">
        <Image src={event.hero} alt="" fill className="object-cover" sizes="(min-width: 1024px) 480px, 100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border/60 bg-card/75 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur-md dark:border-white/15 dark:bg-background/55">
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

      <div className="grid min-w-0 gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CloudSun className="size-4 text-mist" aria-hidden />
            <span>
              {event.weather.highF}° / {event.weather.lowF}° · {event.weather.label}
            </span>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">{cd.sub}</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex -space-x-2.5">
              {event.attendees.slice(0, 4).map((a) => (
                <Avatar key={a.name} className="ring-2 ring-background/90" size="lg">
                  <AvatarImage src={a.avatar} alt="" />
                  <AvatarFallback>{initials(a.name)}</AvatarFallback>
                </Avatar>
              ))}
              {event.attendeeExtra > 0 && (
                <div className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-muted/80 text-[11px] font-medium text-muted-foreground ring-2 ring-background/90 dark:border-white/10 dark:bg-white/[0.06]">
                  +{event.attendeeExtra}
                </div>
              )}
            </div>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">Full house, soft edges.</span>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Button
              type="button"
              size="sm"
              variant={joined ? "default" : "outline"}
              className="min-h-11 w-full rounded-xl touch-manipulation sm:min-h-9 sm:w-auto"
              onClick={() => setJoined((j) => !j)}
            >
              <Users className="size-3.5" data-icon="inline-start" />
              {joined ? "On the list" : "Join weekend"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={rsvp === "going" ? "default" : "outline"}
              className="min-h-11 w-full rounded-xl touch-manipulation sm:min-h-9 sm:w-auto"
              onClick={() =>
                setRsvp((prev) => (prev === "going" ? "maybe" : prev === "maybe" ? "invite" : "going"))
              }
            >
              {rsvpLabel}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {["🔥", "🌿", "❤️"].map((emoji) => (
            <motion.button
              key={emoji}
              type="button"
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              onClick={() => toggleRx(emoji)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                rx[emoji]
                  ? "border-primary/35 bg-primary/15 text-foreground"
                  : "border-border/60 bg-muted/60 text-muted-foreground hover:border-border dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/18"
              )}
            >
              {emoji}
            </motion.button>
          ))}
        </div>

        <Separator className="bg-border/55 dark:bg-white/10" />

        <ul className="space-y-2 text-sm text-muted-foreground">
          {event.quickDetails.map((d) => (
            <li key={d} className="ar-surface-inset flex gap-2 rounded-2xl px-3 py-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
              <span>{d}</span>
            </li>
          ))}
        </ul>

        <div className="ar-surface-inset rounded-2xl p-3">
          <p className="text-[11px] font-medium text-muted-foreground">Recent thread</p>
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

        {onOpenWeekendHub && (
          <Button type="button" variant="secondary" className="min-h-12 w-full rounded-xl touch-manipulation sm:min-h-10" onClick={onOpenWeekendHub}>
            Weekend hub · full context
          </Button>
        )}
      </div>
    </motion.article>
  );
}
