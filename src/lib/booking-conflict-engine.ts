import { dateRangesOverlap } from "@/lib/booking-date-ranges";
import type { BlackoutDate, Booking, BookingStatus } from "@/models/booking";

export type BookingConflictResult =
  | { blocked: true; reason: "blackout"; blackout: BlackoutDate }
  | { blocked: false; status: "pending"; conflictsWith: [] }
  | { blocked: false; status: "pending_conflict"; conflictsWith: string[] };

const RESERVING_STATUSES: BookingStatus[] = ["approved"];

export function bookingReservesDates(status: BookingStatus): boolean {
  return RESERVING_STATUSES.includes(status);
}

export function findOverlappingBlackout(
  blackouts: readonly BlackoutDate[],
  startDate: Date,
  endDate: Date,
  excludeBlackoutId?: string
): BlackoutDate | null {
  for (const b of blackouts) {
    if (excludeBlackoutId && b.id === excludeBlackoutId) continue;
    if (dateRangesOverlap(startDate, endDate, b.startDate, b.endDate)) return b;
  }
  return null;
}

export function findOverlappingApprovedBookings(
  bookings: readonly Booking[],
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string
): Booking[] {
  return bookings.filter((b) => {
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (!bookingReservesDates(b.status)) return false;
    return dateRangesOverlap(startDate, endDate, b.startDate, b.endDate);
  });
}

/** Resolves initial status + conflict metadata for a new booking request. */
export function resolveBookingCreateConflict(
  blackouts: readonly BlackoutDate[],
  existingBookings: readonly Booking[],
  startDate: Date,
  endDate: Date
): BookingConflictResult {
  const blackout = findOverlappingBlackout(blackouts, startDate, endDate);
  if (blackout) {
    return { blocked: true, reason: "blackout", blackout };
  }

  const approvedOverlaps = findOverlappingApprovedBookings(existingBookings, startDate, endDate);
  if (approvedOverlaps.length > 0) {
    return {
      blocked: false,
      status: "pending_conflict",
      conflictsWith: approvedOverlaps.map((b) => b.id),
    };
  }

  return { blocked: false, status: "pending", conflictsWith: [] };
}

export const BLACKOUT_BLOCK_MESSAGE =
  "Those dates are blocked for maintenance or a family hold. Pick different dates.";
