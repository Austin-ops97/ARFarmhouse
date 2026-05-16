/**
 * Calendar domain — merged events, filters, multi-day layout.
 */

export type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
export { mergeEventsIntoMonthMeta } from "@/lib/calendar-event-merge";
export { filterCalendarEvents } from "@/lib/calendar-filters";
export { layoutSpansForWeekRow } from "@/lib/calendar-multiday-layout";
export { mergeBookingsAndBlackoutsForMonth } from "@/lib/calendar-booking-display";
