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

/** Month-scoped coordination item (day numbers are 1…daysInMonth for the viewed month). */
export type PropertyCalendarEvent = {
  id: string;
  title: string;
  startDay: number;
  endDay?: number;
  timeLabel?: string;
  kind: PropertyCalendarEventKind;
  accent: PropertyCalendarEventAccent;
};

/** Live bookings/events will subscribe here — empty until Firestore calendar exists. */
export const PROPERTY_CALENDAR_EVENTS: PropertyCalendarEvent[] = [];
