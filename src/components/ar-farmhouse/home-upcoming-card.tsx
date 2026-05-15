"use client";

import { CalendarRange, ChevronRight, Users } from "lucide-react";
import { useMemo } from "react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Button } from "@/components/ui/button";
import { useHomeCalendarEvents } from "@/contexts/home-calendar-context";
import { resolveHomeBookingSnapshot } from "@/lib/home-upcoming";
import { cn } from "@/lib/utils";

const surface =
  "relative overflow-hidden rounded-[1.35rem] border border-border/50 bg-card/80 shadow-[var(--ar-float-elevate)] dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-[0_24px_60px_-40px_rgba(0,0,0,0.85)]";

export function HomeUpcomingCard() {
  const { goTo, openWeekendHub } = useEcosystem();
  const events = useHomeCalendarEvents();
  const snapshot = useMemo(() => resolveHomeBookingSnapshot(events), [events]);

  if (snapshot.kind === "empty") {
    return (
      <section className={cn(surface, "p-6 sm:p-8")} aria-label="Upcoming bookings">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted/60 ring-1 ring-border/50 dark:bg-white/[0.05] dark:ring-white/[0.08]">
            <CalendarRange className="size-5 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
              Upcoming
            </p>
            <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              No stays on the calendar yet
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              When a booking is confirmed, arrival dates, guests, and countdowns appear here automatically.
            </p>
            <Button type="button" className="mt-1 rounded-full" onClick={() => goTo("calendar")}>
              Open calendar
              <ChevronRight className="size-4 opacity-80" data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const { event, kind, dateLabel, durationNights, guestSummary, countdownLabel } = snapshot;

  return (
    <section className={cn(surface)} aria-label="Upcoming bookings">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-mist/[0.04]" aria-hidden />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary/90">
              {kind === "active" ? "Current stay" : "Next on the calendar"}
            </p>
            {countdownLabel && (
              <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                {countdownLabel}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full border-border/60 bg-background/60 dark:border-white/10 dark:bg-white/[0.04]"
            onClick={() => goTo("calendar")}
          >
            Calendar
          </Button>
        </div>

        <h2 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
          {event.title}
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-border/40 bg-muted/30 px-4 py-3.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <CalendarRange className="mt-0.5 size-4 shrink-0 text-primary/90" aria-hidden />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Dates</p>
              <p className="mt-1 text-sm font-medium text-foreground">{dateLabel}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {durationNights} night{durationNights === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-border/40 bg-muted/30 px-4 py-3.5 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <Users className="mt-0.5 size-4 shrink-0 text-primary/90" aria-hidden />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Guests</p>
              <p className="mt-1 text-sm font-medium text-foreground">{guestSummary}</p>
              <p className="mt-0.5 text-xs capitalize text-muted-foreground">{event.status.replace("_", " ")}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" className="rounded-full" onClick={() => openWeekendHub("current")}>
            Weekend hub
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full text-muted-foreground"
            onClick={() => goTo("calendar")}
          >
            View all bookings
          </Button>
        </div>
      </div>
    </section>
  );
}
