import type { BusyWeekendSummary, CalendarGridDay, CalendarMonthMeta } from "@/lib/calendar-month-meta";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";

export type DayOccupancyHeat = 0 | 1 | 2 | 3;

export function eventSpansDay(event: PropertyCalendarEvent, day: number): boolean {
  const end = event.endDay ?? event.startDay;
  return day >= event.startDay && day <= end;
}

export function eventsOnDay(day: number, events: PropertyCalendarEvent[]): PropertyCalendarEvent[] {
  return events.filter((e) => eventSpansDay(e, day));
}

/** 0 open · 1 light · 2 moderate · 3 busy (overlap or high guest count). */
export function dayOccupancyHeat(day: number, events: PropertyCalendarEvent[]): DayOccupancyHeat {
  const onDay = eventsOnDay(day, events);
  if (onDay.length === 0) return 0;
  const guestLoad = onDay.reduce((sum, e) => sum + (e.guests || 0), 0);
  if (onDay.length >= 2 || guestLoad >= 10) return 3;
  if (guestLoad >= 6 || onDay.length > 1) return 2;
  return 1;
}

function dayStatusFromEvents(day: number, events: PropertyCalendarEvent[]): CalendarGridDay["status"] {
  const onDay = eventsOnDay(day, events);
  if (onDay.length === 0) return "open";
  const heat = dayOccupancyHeat(day, events);
  if (heat >= 3) return "busy";
  const hasCheckout = onDay.some((e) => (e.endDay ?? e.startDay) === day && e.startDay !== day);
  if (hasCheckout) return "checkout";
  return "booked";
}

export function mergeEventsIntoMonthMeta(
  base: CalendarMonthMeta,
  events: PropertyCalendarEvent[]
): CalendarMonthMeta {
  const days: CalendarGridDay[] = base.days.map((d) => {
    const onDay = eventsOnDay(d.day, events);
    const status = dayStatusFromEvents(d.day, events);
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
  const monthWord = view.toLocaleString("en-US", { month: "long" });

  return events
    .filter((e) => {
      if (e.year < y || (e.year === y && e.monthIndex < m)) return false;
      if (e.year === y && e.monthIndex === m) return (e.endDay ?? e.startDay) >= today;
      return true;
    })
    .sort((a, b) => a.startDay - b.startDay || a.title.localeCompare(b.title))
    .map((e) => {
      const end = e.endDay ?? e.startDay;
      const rangeLabel =
        end !== e.startDay ? `${monthWord} ${e.startDay}–${end}` : `${monthWord} ${e.startDay}`;
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
    const eEnd = e.endDay ?? e.startDay;
    if (lo <= eEnd && e.startDay <= hi) return e;
  }
  return null;
}
