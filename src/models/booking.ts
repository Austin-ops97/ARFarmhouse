import type { Timestamp } from "firebase/firestore";

import type { BookingActivityEntry, BookingActivityEntryClient } from "@/lib/booking-activity";
import type { PropertyScoped } from "@/platform/constants/property";

/** Unified booking / special-event record (`bookings/{bookingId}`). */
export type BookingType = "booking" | "event";

export type BookingStatus =
  | "pending"
  | "pending_conflict"
  | "approved"
  | "denied"
  | "cancelled";

export type FirestoreBooking = PropertyScoped & {
  title: string;
  description: string;
  type: BookingType;
  startDate: Timestamp;
  endDate: Timestamp;
  status: BookingStatus;
  createdBy: string;
  createdByName: string;
  approvedBy: string | null;
  approvedAt: Timestamp | null;
  deniedReason: string | null;
  /** Approved bookings this request overlaps (set when status is `pending_conflict`). */
  conflictsWith?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Links to legacy `calendarEvents` doc for calendar UI compatibility. */
  calendarEventId?: string | null;
  /** Links to legacy `bookingRequests` audit doc when present. */
  legacyBookingRequestId?: string | null;
  /** Accountability timeline for admins and members. */
  activityLog?: BookingActivityEntry[];
  deleted?: boolean;
  deletedAt?: Timestamp | null;
  deletedBy?: string | null;
};

export type Booking = PropertyScoped & {
  id: string;
  title: string;
  description: string;
  type: BookingType;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
  createdBy: string;
  createdByName: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  deniedReason: string | null;
  conflictsWith: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
  calendarEventId: string | null;
  legacyBookingRequestId: string | null;
  activityLog: BookingActivityEntryClient[];
  deleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
};

export type FirestoreBlackoutDate = {
  title: string;
  reason: string;
  startDate: Timestamp;
  endDate: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
};

export type BlackoutDate = {
  id: string;
  title: string;
  reason: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
  createdAt: Date | null;
};

export const BOOKINGS_COLLECTION = "bookings";
export const BLACKOUT_DATES_COLLECTION = "blackoutDates";
