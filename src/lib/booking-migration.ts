import type { Booking, BookingStatus } from "@/models/booking";
import type { PropertyCalendarEvent, CalendarEventStatus } from "@/lib/property-calendar-events";
import { calendarDayRangeToDates } from "@/lib/booking-dates";

/** Maps unified booking approval status to legacy calendar event status. */
export function bookingStatusToCalendarStatus(status: BookingStatus): CalendarEventStatus {
  if (status === "approved") return "confirmed";
  if (status === "cancelled" || status === "denied") return "cancelled";
  if (status === "pending_conflict") return "pending";
  return "pending";
}

/** Maps legacy calendar event status to unified booking status. */
export function calendarStatusToBookingStatus(status: CalendarEventStatus): BookingStatus {
  if (status === "confirmed") return "approved";
  if (status === "cancelled") return "cancelled";
  return "pending";
}

export type LegacyCalendarEventDoc = {
  title?: string;
  startDay?: number;
  endDay?: number;
  year?: number;
  monthIndex?: number;
  status?: string;
  tripPurpose?: string;
  notes?: string;
  requestedBy?: string;
  requestedByName?: string;
  bookingRequestId?: string;
};

/** Builds a unified booking shape from a legacy `calendarEvents` document. */
export function bookingFromLegacyCalendarEvent(
  id: string,
  data: LegacyCalendarEventDoc
): Omit<Booking, "createdAt" | "updatedAt" | "approvedBy" | "approvedAt" | "deniedReason"> & {
  createdAt: null;
  updatedAt: null;
  approvedBy: null;
  approvedAt: null;
  deniedReason: null;
} {
  const year = data.year ?? new Date().getFullYear();
  const monthIndex = data.monthIndex ?? new Date().getMonth();
  const startDay = data.startDay ?? 1;
  const endDay = data.endDay ?? startDay;
  const { startDate, endDate } = calendarDayRangeToDates(year, monthIndex, startDay, endDay);
  const legacyStatus =
    data.status === "confirmed" || data.status === "cancelled" ? data.status : "pending";

  return {
    id,
    title: data.title?.trim() || "Stay",
    description: (data.notes?.trim() || data.tripPurpose?.trim() || "").trim(),
    type: "booking",
    startDate,
    endDate,
    status: calendarStatusToBookingStatus(legacyStatus),
    createdBy: data.requestedBy ?? "",
    createdByName: data.requestedByName?.trim() || "Member",
    approvedBy: null,
    approvedAt: null,
    deniedReason: null,
    createdAt: null,
    updatedAt: null,
    calendarEventId: id,
    legacyBookingRequestId: data.bookingRequestId ?? null,
    conflictsWith: [],
    activityLog: [],
    deleted: false,
    deletedAt: null,
    deletedBy: null,
    deletedReason: null,
    policyAcknowledgment: null,
  };
}

/** Converts a unified booking into the month-scoped calendar event used by the UI. */
export function bookingToCalendarEvent(
  booking: Pick<
    Booking,
    | "id"
    | "title"
    | "startDate"
    | "endDate"
    | "status"
    | "createdBy"
    | "createdByName"
    | "description"
    | "calendarEventId"
  >,
  extras?: Partial<PropertyCalendarEvent>
): PropertyCalendarEvent {
  const start = booking.startDate;
  const end = booking.endDate;
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();
  const monthIndex = start.getMonth();

  return {
    id: booking.calendarEventId ?? booking.id,
    title: booking.title,
    startDay,
    endDay,
    kind: extras?.kind ?? "family_booking",
    accent: extras?.accent ?? "mint",
    status: bookingStatusToCalendarStatus(booking.status),
    guests: extras?.guests ?? 0,
    tripId: extras?.tripId ?? "family",
    tripPurpose: extras?.tripPurpose ?? booking.description,
    notes: extras?.notes ?? booking.description,
    requestedBy: booking.createdBy,
    requestedByName: booking.createdByName,
    attendeeLabels: extras?.attendeeLabels ?? [],
    attendeePetIds: extras?.attendeePetIds ?? [],
    year,
    monthIndex,
    timeLabel: extras?.timeLabel,
  };
}
