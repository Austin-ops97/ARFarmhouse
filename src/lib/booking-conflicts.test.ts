import { describe, expect, it } from "vitest";

import { findOverlappingCalendarEvent, type CalendarEventRange } from "@/lib/booking-conflicts";

const events: CalendarEventRange[] = [
  { id: "a", title: "Family stay", startDay: 10, endDay: 12, year: 2026, monthIndex: 4 },
  { id: "b", title: "Other month", startDay: 5, endDay: 7, year: 2026, monthIndex: 5 },
];

describe("findOverlappingCalendarEvent", () => {
  it("finds overlap in the same month", () => {
    const hit = findOverlappingCalendarEvent(events, 2026, 4, 11, 13);
    expect(hit?.id).toBe("a");
  });

  it("ignores events in other months", () => {
    expect(findOverlappingCalendarEvent(events, 2026, 4, 5, 7)).toBeUndefined();
  });

  it("can exclude an event id", () => {
    expect(findOverlappingCalendarEvent(events, 2026, 4, 10, 12, "a")).toBeUndefined();
  });
});
