import type { Booking } from "@/models/booking";

export const BOOKING_DENIALS_COLLECTION = "bookingDenials";

export type BookingDenialAudit = {
  originalBookingId: string;
  deniedBy: string;
  deniedAt: Date;
  requesterUid: string;
  requesterName: string;
  startDate: Date;
  endDate: Date;
  title: string;
  reason: string | null;
  calendarEventId: string | null;
  legacyBookingRequestId: string | null;
  notificationQueued: boolean;
};

export function buildBookingDenialAudit(
  booking: Booking,
  actorUid: string,
  reason: string,
  notificationQueued: boolean
): BookingDenialAudit {
  const trimmed = reason.trim();
  return {
    originalBookingId: booking.id,
    deniedBy: actorUid,
    deniedAt: new Date(),
    requesterUid: booking.createdBy,
    requesterName: booking.createdByName,
    startDate: booking.startDate,
    endDate: booking.endDate,
    title: booking.title,
    reason: trimmed || null,
    calendarEventId: booking.calendarEventId,
    legacyBookingRequestId: booking.legacyBookingRequestId,
    notificationQueued,
  };
}
