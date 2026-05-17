import type { BookingStatus } from "@/models/booking";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";

/** Statuses that participate in calendar, counts, and weekend hub surfaces. */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = [
  "pending",
  "pending_conflict",
  "approved",
];

const TERMINAL_BOOKING_STATUSES: readonly BookingStatus[] = ["denied", "cancelled"];

export function isActiveBookingStatus(status: BookingStatus): boolean {
  return (ACTIVE_BOOKING_STATUSES as readonly string[]).includes(status);
}

export function isTerminalBookingStatus(status: BookingStatus): boolean {
  return (TERMINAL_BOOKING_STATUSES as readonly string[]).includes(status);
}

/** User-facing calendar rows from unified bookings. */
export function bookingIsCalendarVisible(booking: {
  status: BookingStatus;
  deleted?: boolean;
}): boolean {
  if (booking.deleted) return false;
  return isActiveBookingStatus(booking.status);
}

/** Calendar events shown in feeds, hub, home, and occupancy (excludes cancelled/denied). */
export function calendarEventIsUserVisible(event: PropertyCalendarEvent): boolean {
  if (event.status === "cancelled") return false;
  const unified = event.unifiedStatus;
  if (unified === "denied" || unified === "cancelled") return false;
  return true;
}
