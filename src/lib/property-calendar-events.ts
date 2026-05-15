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

export type CalendarEventStatus = "pending" | "confirmed" | "cancelled";

/** Month-scoped coordination item (day numbers are 1…daysInMonth for the viewed month). */
export type PropertyCalendarEvent = {
  id: string;
  title: string;
  startDay: number;
  endDay: number;
  timeLabel?: string;
  kind: PropertyCalendarEventKind;
  accent: PropertyCalendarEventAccent;
  status: CalendarEventStatus;
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
