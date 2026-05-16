export type PropertyCalendarEventKind =
  | "family_booking"
  | "fishing"
  | "holiday_gathering"
  | "work_weekend"
  | "quiet_retreat"
  | "deer_camp"
  | "maintenance"
  | "birthday"
  | "holiday";

export type PropertyCalendarEventAccent =
  | "mint"
  | "amber"
  | "rose"
  | "sky"
  | "violet"
  | "slate"
  | "emerald";

import type { BookingStatus, BookingType } from "@/models/booking";

export type CalendarEventStatus = "pending" | "confirmed" | "cancelled";

/** Month-scoped coordination item (day numbers are 1…daysInMonth for the viewed month). */
export type PropertyCalendarEvent = {
  id: string;
  /** Unified `bookings` document id when sourced from Phase 2 data. */
  bookingId?: string | null;
  title: string;
  startDay: number;
  endDay: number;
  timeLabel?: string;
  kind: PropertyCalendarEventKind;
  accent: PropertyCalendarEventAccent;
  status: CalendarEventStatus;
  /** Full approval workflow status from unified bookings. */
  unifiedStatus?: BookingStatus;
  recordType?: BookingType;
  conflictsWith?: string[];
  isBlackout?: boolean;
  guests: number;
  tripId: string;
  tripPurpose: string;
  notes: string;
  requestedBy: string;
  requestedByName: string;
  attendeeLabels: string[];
  attendeePetIds: string[];
  year: number;
  monthIndex: number;
};

export const PROPERTY_CALENDAR_EVENTS: PropertyCalendarEvent[] = [];
