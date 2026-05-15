import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";

export type HomeBookingSnapshot =
  | { kind: "empty" }
  | {
      kind: "active" | "upcoming";
      event: PropertyCalendarEvent;
      start: Date;
      end: Date;
      dateLabel: string;
      durationNights: number;
      guestSummary: string;
      countdownLabel: string | null;
    };

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function calendarEventStart(event: PropertyCalendarEvent): Date {
  return new Date(event.year, event.monthIndex, event.startDay);
}

export function calendarEventEnd(event: PropertyCalendarEvent): Date {
  const endDay = event.endDay ?? event.startDay;
  return new Date(event.year, event.monthIndex, endDay, 23, 59, 59, 999);
}

export function formatCalendarEventRange(event: PropertyCalendarEvent): string {
  const monthWord = new Date(event.year, event.monthIndex, 1).toLocaleString("en-US", {
    month: "long",
  });
  const end = event.endDay ?? event.startDay;
  if (end !== event.startDay) {
    return `${monthWord} ${event.startDay}–${end}, ${event.year}`;
  }
  return `${monthWord} ${event.startDay}, ${event.year}`;
}

function durationNights(event: PropertyCalendarEvent): number {
  const end = event.endDay ?? event.startDay;
  return Math.max(1, end - event.startDay + 1);
}

function guestSummary(event: PropertyCalendarEvent): string {
  const names = event.attendeeLabels
    .map((l) => l.replace(/ \(pet\)$/i, "").trim())
    .filter(Boolean);
  if (names.length > 0) {
    const shown = names.slice(0, 4);
    const extra = names.length - shown.length;
    return extra > 0 ? `${shown.join(", ")} +${extra}` : shown.join(", ");
  }
  if (event.requestedByName?.trim()) return event.requestedByName.trim();
  return `${event.guests} guest${event.guests === 1 ? "" : "s"}`;
}

export function formatCountdownToDate(target: Date, now: Date = new Date()): string | null {
  const today = startOfDay(now).getTime();
  const targetDay = startOfDay(target).getTime();
  const diffDays = Math.round((targetDay - today) / 86_400_000);

  if (diffDays < 0) return null;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `${diffDays} days away`;
}

function isConfirmed(event: PropertyCalendarEvent): boolean {
  return event.status !== "cancelled";
}

function isActiveStay(event: PropertyCalendarEvent, now: Date): boolean {
  if (!isConfirmed(event)) return false;
  const t = now.getTime();
  return t >= calendarEventStart(event).getTime() && t <= calendarEventEnd(event).getTime();
}

function sortByStart(a: PropertyCalendarEvent, b: PropertyCalendarEvent): number {
  const da = calendarEventStart(a).getTime() - calendarEventStart(b).getTime();
  if (da !== 0) return da;
  return (a.endDay ?? a.startDay) - (b.endDay ?? b.startDay);
}

/** Primary home hero: active stay, else next upcoming booking from live calendar events. */
export function resolveHomeBookingSnapshot(
  events: readonly PropertyCalendarEvent[],
  now: Date = new Date()
): HomeBookingSnapshot {
  const confirmed = events.filter(isConfirmed).sort(sortByStart);
  const active = confirmed.find((e) => isActiveStay(e, now));
  const pick = active ?? confirmed.find((e) => calendarEventEnd(e) >= startOfDay(now));

  if (!pick) return { kind: "empty" };

  const start = calendarEventStart(pick);
  const end = calendarEventEnd(pick);
  const kind = active ? "active" : "upcoming";

  return {
    kind,
    event: pick,
    start,
    end,
    dateLabel: formatCalendarEventRange(pick),
    durationNights: durationNights(pick),
    guestSummary: guestSummary(pick),
    countdownLabel: kind === "upcoming" ? formatCountdownToDate(start, now) : "In progress",
  };
}
