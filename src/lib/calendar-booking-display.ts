import { bookingIsCalendarVisible } from "@/lib/booking-active";
import { clipRangeToMonthDays } from "@/lib/booking-date-ranges";
import { bookingStatusToCalendarStatus } from "@/lib/booking-migration";
import type { CalendarMonthMeta } from "@/lib/calendar-month-meta";
import type { PropertyCalendarEvent, PropertyCalendarEventAccent } from "@/lib/property-calendar-events";
import type { BlackoutDate, Booking, BookingType } from "@/models/booking";

export { bookingIsCalendarVisible };

const EVENT_ACCENT: PropertyCalendarEventAccent = "violet";
const BOOKING_ACCENT: PropertyCalendarEventAccent = "mint";
const CONFLICT_ACCENT: PropertyCalendarEventAccent = "amber";
const DENIED_ACCENT: PropertyCalendarEventAccent = "slate";

function accentForBooking(booking: Pick<Booking, "status" | "type">): PropertyCalendarEventAccent {
  if (booking.status === "pending_conflict") return CONFLICT_ACCENT;
  if (booking.status === "denied" || booking.status === "cancelled") return DENIED_ACCENT;
  if (booking.type === "event") return EVENT_ACCENT;
  return BOOKING_ACCENT;
}

function kindForType(type: BookingType): PropertyCalendarEvent["kind"] {
  return type === "event" ? "holiday_gathering" : "family_booking";
}

/** Maps a unified booking to a month-scoped calendar event (clipped to the viewed month). */
export function bookingToMonthCalendarEvent(
  booking: Booking,
  month: Pick<CalendarMonthMeta, "year" | "monthIndex" | "daysInMonth">
): PropertyCalendarEvent | null {
  const clipped = clipRangeToMonthDays(
    booking.startDate,
    booking.endDate,
    month.year,
    month.monthIndex,
    month.daysInMonth
  );
  if (!clipped) return null;

  return {
    id: booking.calendarEventId ?? booking.id,
    bookingId: booking.id,
    title: booking.title,
    startDay: clipped.startDay,
    endDay: clipped.endDay,
    kind: kindForType(booking.type),
    accent: accentForBooking(booking),
    status: bookingStatusToCalendarStatus(
      booking.status === "pending_conflict" ? "pending" : booking.status
    ),
    unifiedStatus: booking.status,
    recordType: booking.type,
    guests: 0,
    tripId: booking.type === "event" ? "event" : "family",
    tripPurpose: booking.description,
    notes: booking.description,
    requestedBy: booking.createdBy,
    requestedByName: booking.createdByName,
    attendeeLabels: [],
    attendeePetIds: [],
    year: month.year,
    monthIndex: month.monthIndex,
    conflictsWith: booking.conflictsWith,
    isBlackout: false,
  };
}

export function blackoutToMonthCalendarEvent(
  blackout: BlackoutDate,
  month: Pick<CalendarMonthMeta, "year" | "monthIndex" | "daysInMonth">
): PropertyCalendarEvent | null {
  const clipped = clipRangeToMonthDays(
    blackout.startDate,
    blackout.endDate,
    month.year,
    month.monthIndex,
    month.daysInMonth
  );
  if (!clipped) return null;

  return {
    id: `blackout-${blackout.id}`,
    bookingId: null,
    title: blackout.title || "Blackout",
    startDay: clipped.startDay,
    endDay: clipped.endDay,
    kind: "maintenance",
    accent: "slate",
    status: "confirmed",
    unifiedStatus: "approved",
    recordType: "booking",
    guests: 0,
    tripId: "blackout",
    tripPurpose: blackout.reason,
    notes: blackout.reason,
    requestedBy: blackout.createdBy,
    requestedByName: "Admin",
    attendeeLabels: [],
    attendeePetIds: [],
    year: month.year,
    monthIndex: month.monthIndex,
    conflictsWith: [],
    isBlackout: true,
  };
}

export function mergeBookingsAndBlackoutsForMonth(
  bookings: readonly Booking[],
  blackouts: readonly BlackoutDate[],
  month: Pick<CalendarMonthMeta, "year" | "monthIndex" | "daysInMonth" | "label">
): PropertyCalendarEvent[] {
  const events: PropertyCalendarEvent[] = [];
  for (const b of bookings) {
    if (!bookingIsCalendarVisible(b)) continue;
    const ev = bookingToMonthCalendarEvent(b, month);
    if (ev) events.push(ev);
  }
  for (const bl of blackouts) {
    const ev = blackoutToMonthCalendarEvent(bl, month);
    if (ev) events.push(ev);
  }
  return events.sort((a, b) => a.startDay - b.startDay || a.title.localeCompare(b.title));
}
