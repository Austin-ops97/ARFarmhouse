import type { Timestamp } from "firebase/firestore";

/** Centralized platform configuration (`systemSettings/global`). */
export type BookingLimitsConfig = {
  maxActiveBookingsPerUser: number;
  maxBookingDurationDays: number;
  maxAdvanceBookingDays: number;
  minNoticeHours: number;
  maxPendingBookingsPerUser: number;
};

export type FirestoreSystemSettings = {
  bookingLimits: BookingLimitsConfig;
  updatedAt: Timestamp;
  updatedBy: string;
};

export type SystemSettings = {
  bookingLimits: BookingLimitsConfig;
  updatedAt: Date | null;
  updatedBy: string;
};

export const SYSTEM_SETTINGS_COLLECTION = "systemSettings";
export const SYSTEM_SETTINGS_DOC_ID = "global";

export const DEFAULT_BOOKING_LIMITS: BookingLimitsConfig = {
  maxActiveBookingsPerUser: 3,
  maxBookingDurationDays: 14,
  maxAdvanceBookingDays: 180,
  minNoticeHours: 0,
  maxPendingBookingsPerUser: 5,
};
