import { calendarEventIsUserVisible } from "@/lib/booking-active";
import type { BusyWeekendSummary, CalendarGridDay, CalendarMonthMeta } from "@/lib/calendar-month-meta";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";

export type DayOccupancyHeat = 0 | 1 | 2 | 3;

export function eventIsActive(event: PropertyCalendarEvent): boolean {
  return calendarEventIsUserVisible(event);
}

/** Confirmed stays only — pending requests are not treated as occupying the property. */
export function eventOccupiesPhysicalProperty(event: PropertyCalendarEvent): boolean {
  if (event.isBlackout) return true;
  if (event.unifiedStatus) return event.unifiedStatus === "approved";
  return event.status === "confirmed";
}

/** Whether a day cell should show reserved / busy styling (not just a dot). */
export function eventReservesCalendarDay(event: PropertyCalendarEvent): boolean {
  return eventOccupiesPhysicalProperty(event);
}

export function eventSpansDay(event: PropertyCalendarEvent, day: number): boolean {
  const end = event.endDay ?? event.startDay;
  return day >= event.startDay && day <= end;
}

/** Events on a calendar day, scoped to month/year and excluding cancelled. */
export function eventsOnCalendarDay(
  day: number,
  year: number,
  monthIndex: number,
  events: readonly PropertyCalendarEvent[]
): PropertyCalendarEvent[] {
  return events.filter(
    (e) =>
      eventIsActive(e) &&
      e.year === year &&
      e.monthIndex === monthIndex &&
      eventSpansDay(e, day)
  );
}

/** @deprecated Prefer eventsOnCalendarDay with explicit year/monthIndex */
export function eventsOnDay(day: number, events: PropertyCalendarEvent[]): PropertyCalendarEvent[] {
  return events.filter((e) => eventIsActive(e) && eventSpansDay(e, day));
}

/** Stays overlapping “today” in local timezone (uses event month/year + day numbers). */
export function eventsActiveOnLocalDate(
  events: readonly PropertyCalendarEvent[],
  view: Date = new Date()
): PropertyCalendarEvent[] {
  const y = view.getFullYear();
  const m = view.getMonth();
  const d = view.getDate();
  return events.filter((e) => {
    if (!eventOccupiesPhysicalProperty(e)) return false;
    if (e.year !== y || e.monthIndex !== m) return false;
    const end = e.endDay ?? e.startDay;
    return d >= e.startDay && d <= end;
  });
}

/** 0 open · 1 light · 2 moderate · 3 busy (overlap or high guest count). */
export function dayOccupancyHeat(
  day: number,
  year: number,
  monthIndex: number,
  events: readonly PropertyCalendarEvent[]
): DayOccupancyHeat {
  const onDay = eventsOnCalendarDay(day, year, monthIndex, events).filter(eventReservesCalendarDay);
  if (onDay.length === 0) return 0;
  const guestLoad = onDay.reduce((sum, e) => sum + (e.guests || 0), 0);
  if (onDay.length >= 2 || guestLoad >= 10) return 3;
  if (guestLoad >= 6 || onDay.length > 1) return 2;
  return 1;
}

function dayStatusFromEvents(
  day: number,
  year: number,
  monthIndex: number,
  events: readonly PropertyCalendarEvent[]
): CalendarGridDay["status"] {
  const onDay = eventsOnCalendarDay(day, year, monthIndex, events).filter(eventReservesCalendarDay);
  if (onDay.length === 0) return "open";
  const heat = dayOccupancyHeat(day, year, monthIndex, events);
  if (heat >= 3) return "busy";
  const hasCheckout = onDay.some((e) => (e.endDay ?? e.startDay) === day && e.startDay !== day);
  if (hasCheckout) return "checkout";
  return "booked";
}

export function mergeEventsIntoMonthMeta(
  base: CalendarMonthMeta,
  events: PropertyCalendarEvent[]
): CalendarMonthMeta {
  const { year, monthIndex } = base;
  const days: CalendarGridDay[] = base.days.map((d) => {
    const onDay = eventsOnCalendarDay(d.day, year, monthIndex, events);
    const status = dayStatusFromEvents(d.day, year, monthIndex, events);
    const primary = onDay[0];
    const guests =
      onDay.length > 0
        ? [
            primary
              ? `${primary.guests} guest${primary.guests === 1 ? "" : "s"}`
              : undefined,
            ...(primary?.attendeeLabels?.slice(0, 2) ?? []),
          ].filter((x): x is string => Boolean(x))
        : undefined;
    return {
      ...d,
      status,
      guests,
    };
  });

  const busyWeekends: BusyWeekendSummary[] = [];
  const monthWord = base.label.split(" ")[0] ?? "Month";

  for (const ev of events) {
    if (!eventIsActive(ev) || ev.year !== year || ev.monthIndex !== monthIndex) continue;
    const end = ev.endDay ?? ev.startDay;
    const span = end - ev.startDay + 1;
    if (span < 2 && ev.guests < 6) continue;
    const range =
      end !== ev.startDay ? `${monthWord} ${ev.startDay}–${end}` : `${monthWord} ${ev.startDay}`;
    busyWeekends.push({
      range,
      title: ev.title,
      occupancy: `${ev.guests} guest${ev.guests === 1 ? "" : "s"}`,
      tone: ev.guests >= 8 || span >= 3 ? "busy" : "booked",
    });
  }

  return { ...base, days, busyWeekends: busyWeekends.slice(0, 6) };
}

export type UpcomingStayCard = {
  id: string;
  title: string;
  rangeLabel: string;
  guests: number;
  attendeePreview: string;
  status: PropertyCalendarEvent["status"];
  accent: PropertyCalendarEvent["accent"];
};

export function buildUpcomingStays(
  events: PropertyCalendarEvent[],
  view: Date = new Date()
): UpcomingStayCard[] {
  const y = view.getFullYear();
  const m = view.getMonth();
  const today = view.getDate();

  return events
    .filter((e) => {
      if (!eventIsActive(e)) return false;
      if (e.year < y || (e.year === y && e.monthIndex < m)) return false;
      if (e.year === y && e.monthIndex === m) return (e.endDay ?? e.startDay) >= today;
      return true;
    })
    .sort((a, b) => a.startDay - b.startDay || a.title.localeCompare(b.title))
    .map((e) => {
      const end = e.endDay ?? e.startDay;
      const eventMonthWord = new Date(e.year, e.monthIndex, 1).toLocaleString("en-US", { month: "long" });
      const rangeLabel =
        end !== e.startDay
          ? `${eventMonthWord} ${e.startDay}–${end}, ${e.year}`
          : `${eventMonthWord} ${e.startDay}, ${e.year}`;
      const attendeePreview =
        e.attendeeLabels.length > 0
          ? e.attendeeLabels.slice(0, 4).join(", ") + (e.attendeeLabels.length > 4 ? "…" : "")
          : e.requestedByName;
      return {
        id: e.id,
        title: e.title,
        rangeLabel,
        guests: e.guests,
        attendeePreview,
        status: e.status,
        accent: e.accent,
      };
    });
}

/** Next confirmed stay that has not ended before local "today" (for sidebar / pulse). */
export function nextUpcomingBooking(
  events: readonly PropertyCalendarEvent[],
  now: Date = new Date()
): PropertyCalendarEvent | null {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const candidates = events.filter((e) => {
    if (!eventIsActive(e)) return false;
    const end = e.endDay ?? e.startDay;
    if (e.year < y) return false;
    if (e.year === y && e.monthIndex < m) return false;
    if (e.year === y && e.monthIndex === m && end < d) return false;
    return true;
  });
  candidates.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.monthIndex !== b.monthIndex) return a.monthIndex - b.monthIndex;
    return a.startDay - b.startDay;
  });
  return candidates[0] ?? null;
}

export function findEventOverlappingRange(
  events: PropertyCalendarEvent[],
  startDay: number,
  endDay: number,
  excludeId?: string
): PropertyCalendarEvent | null {
  const lo = Math.min(startDay, endDay);
  const hi = Math.max(startDay, endDay);
  for (const e of events) {
    if (excludeId && e.id === excludeId) continue;
    if (!eventIsActive(e)) continue;
    const eEnd = e.endDay ?? e.startDay;
    if (lo <= eEnd && e.startDay <= hi) return e;
  }
  return null;
}
