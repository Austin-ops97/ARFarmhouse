"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarRange, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { formatCalendarEventRange } from "@/lib/home-upcoming";
import { eventsOnCalendarDay } from "@/lib/calendar-event-merge";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import { cn } from "@/lib/utils";

const EVENT_KIND_LABEL: Record<PropertyCalendarEvent["kind"], string> = {
  family_booking: "Booking",
  fishing: "Gathering",
  holiday_gathering: "Holiday gathering",
  work_weekend: "Work weekend",
  quiet_retreat: "Quiet retreat",
  deer_camp: "Deer camp",
  maintenance: "Maintenance",
  birthday: "Birthday",
  holiday: "Holiday",
};

type CalendarDayEventsSheetProps = {
  open: boolean;
  day: number | null;
  year: number;
  monthIndex: number;
  events: PropertyCalendarEvent[];
  onOpenChange: (open: boolean) => void;
};

export function CalendarDayEventsSheet({
  open,
  day,
  year,
  monthIndex,
  events,
  onOpenChange,
}: CalendarDayEventsSheetProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();

  const monthWord = useMemo(
    () => new Date(year, monthIndex, 1).toLocaleString("en-US", { month: "long" }),
    [monthIndex, year]
  );

  const dayEvents = useMemo(() => {
    if (day === null) return [];
    return eventsOnCalendarDay(day, year, monthIndex, events);
  }, [day, events, monthIndex, year]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open]);

  return (
    <AnimatePresence>
      {open && day !== null && (
        <motion.div
          className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.18 }}
        >
          <button type="button" className="ar-scrim absolute inset-0" aria-label="Close" onClick={close} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { y: 32, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className={cn(
              "ar-modal-shell relative z-10 flex max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-bottom,0px)-1rem))] w-full max-w-lg min-h-0 flex-col overflow-hidden rounded-t-[1.75rem] sm:max-h-[min(90dvh,720px)] sm:rounded-[1.75rem]"
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/45 px-5 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-white/10">
              <div className="min-w-0">
                <p id={titleId} className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  {monthWord} {day}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dayEvents.length === 0 ? "No bookings" : `${dayEvents.length} booking${dayEvents.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {dayEvents.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Nothing scheduled for this day. Choose another date or add a booking.
                </p>
              ) : (
                <ul className="space-y-4">
                  {dayEvents.map((e) => {
                    const end = e.endDay ?? e.startDay;
                    const nights = Math.max(1, end - e.startDay + 1);
                    const guests =
                      e.attendeeLabels.length > 0
                        ? e.attendeeLabels.map((l) => l.replace(/ \(pet\)$/i, "")).join(", ")
                        : e.requestedByName || `${e.guests} guest${e.guests === 1 ? "" : "s"}`;
                    return (
                      <li
                        key={e.id}
                        className="rounded-2xl border border-border/50 bg-muted/25 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]"
                      >
                        <p className="text-[10px] font-medium uppercase tracking-wide text-primary/90">
                          {EVENT_KIND_LABEL[e.kind]} · {e.status.replace("_", " ")}
                        </p>
                        <p className="mt-1 font-heading text-base font-semibold text-foreground">{e.title}</p>
                        <div className="mt-3 flex flex-wrap items-start gap-2 text-sm text-muted-foreground">
                          <CalendarRange className="mt-0.5 size-4 shrink-0 text-primary/80" aria-hidden />
                          <span>{formatCalendarEventRange(e)}</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Guests:</span> {guests}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Duration:</span> {nights} night
                          {nights === 1 ? "" : "s"}
                        </p>
                        {e.notes?.trim() ? (
                          <p className="mt-3 border-t border-border/40 pt-3 text-sm leading-relaxed text-foreground/90 dark:border-white/[0.06]">
                            <span className="font-medium text-foreground">Notes · </span>
                            {e.notes.trim()}
                          </p>
                        ) : null}
                        {e.timeLabel ? (
                          <p className="mt-2 text-[13px] text-muted-foreground">Time · {e.timeLabel}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
