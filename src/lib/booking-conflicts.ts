import { rangesOverlap } from "@/lib/booking-calendar";

export type CalendarEventRange = {
  id: string;
  title: string;
  startDay: number;
  endDay?: number;
  year: number;
  monthIndex: number;
};

export function findOverlappingCalendarEvent(
  events: CalendarEventRange[],
  year: number,
  monthIndex: number,
  startDay: number,
  endDay: number,
  excludeEventId?: string
): CalendarEventRange | undefined {
  return events.find((e) => {
    if (excludeEventId && e.id === excludeEventId) return false;
    if (e.year !== year || e.monthIndex !== monthIndex) return false;
    const eEnd = e.endDay ?? e.startDay;
    return rangesOverlap(startDay, endDay, e.startDay, eEnd);
  });
}

export const BOOKING_CONFLICT_MESSAGE =
  "Those dates were just booked by someone else. Refresh the calendar and pick another range.";
