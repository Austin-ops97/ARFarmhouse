import type { BookingLimitsConfig } from "@/models/system-settings";
import { DEFAULT_BOOKING_LIMITS } from "@/models/system-settings";
import type { Booking, BookingStatus } from "@/models/booking";

const ACTIVE_STATUSES: BookingStatus[] = ["pending", "pending_conflict", "approved"];

export type BookingLimitViolation = {
  code:
    | "max_active"
    | "max_pending"
    | "max_duration"
    | "max_advance"
    | "min_notice";
  message: string;
};

export function mergeBookingLimits(
  partial?: Partial<BookingLimitsConfig> | null
): BookingLimitsConfig {
  return { ...DEFAULT_BOOKING_LIMITS, ...partial };
}

function nightsBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function validateBookingLimits(input: {
  limits: BookingLimitsConfig;
  start: Date;
  end: Date;
  now?: Date;
  userBookings: readonly Pick<Booking, "status" | "createdBy" | "startDate" | "endDate">[];
  userId: string;
}): BookingLimitViolation | null {
  const { limits, start, end, userId, userBookings } = input;
  const now = input.now ?? new Date();

  const mine = userBookings.filter((b) => b.createdBy === userId);
  const activeCount = mine.filter((b) => ACTIVE_STATUSES.includes(b.status)).length;
  const pendingCount = mine.filter(
    (b) => b.status === "pending" || b.status === "pending_conflict"
  ).length;

  if (activeCount >= limits.maxActiveBookingsPerUser) {
    return {
      code: "max_active",
      message: `You can have at most ${limits.maxActiveBookingsPerUser} active bookings at a time.`,
    };
  }

  if (pendingCount >= limits.maxPendingBookingsPerUser) {
    return {
      code: "max_pending",
      message: `You already have ${limits.maxPendingBookingsPerUser} requests awaiting review.`,
    };
  }

  const durationDays = nightsBetween(start, end);
  if (durationDays > limits.maxBookingDurationDays) {
    return {
      code: "max_duration",
      message: `Stays cannot exceed ${limits.maxBookingDurationDays} days.`,
    };
  }

  const maxAdvanceMs = limits.maxAdvanceBookingDays * 24 * 60 * 60 * 1000;
  if (start.getTime() - now.getTime() > maxAdvanceMs) {
    return {
      code: "max_advance",
      message: `Bookings can only be made up to ${limits.maxAdvanceBookingDays} days in advance.`,
    };
  }

  const minNoticeMs = limits.minNoticeHours * 60 * 60 * 1000;
  if (start.getTime() - now.getTime() < minNoticeMs) {
    return {
      code: "min_notice",
      message: `Please book at least ${limits.minNoticeHours} hours before your arrival.`,
    };
  }

  return null;
}
