import { describe, expect, it } from "vitest";

import { buildCalendarMonthMeta } from "@/lib/calendar-month-meta";
import {
  dayOccupancyHeat,
  eventsActiveOnLocalDate,
  findEventOverlappingRange,
  mergeEventsIntoMonthMeta,
} from "@/lib/calendar-event-merge";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";

function sampleEvent(overrides: Partial<PropertyCalendarEvent> = {}): PropertyCalendarEvent {
  return {
    id: "e1",
    title: "Family weekend",
    startDay: 10,
    endDay: 12,
    kind: "family_booking",
    accent: "mint",
    status: "pending",
    guests: 6,
    tripId: "family",
    tripPurpose: "",
    notes: "",
    requestedBy: "u1",
    requestedByName: "Alex",
    attendeeLabels: ["Alex", "Sam"],
    attendeePetIds: [],
    year: 2026,
    monthIndex: 4,
    ...overrides,
  };
}

describe("dayOccupancyHeat", () => {
  it("returns 0 for empty day", () => {
    expect(dayOccupancyHeat(5, 2026, 4, [])).toBe(0);
  });

  it("returns elevated heat for heavy guest load", () => {
    expect(dayOccupancyHeat(10, 2026, 4, [sampleEvent({ guests: 10 })])).toBeGreaterThanOrEqual(2);
  });
});

describe("mergeEventsIntoMonthMeta", () => {
  it("marks span days as booked", () => {
    const base = buildCalendarMonthMeta(new Date(2026, 4, 15));
    const merged = mergeEventsIntoMonthMeta(base, [sampleEvent()]);
    expect(merged.days.find((d) => d.day === 10)?.status).toBe("booked");
    expect(merged.days.find((d) => d.day === 11)?.status).toBe("booked");
    expect(merged.busyWeekends.length).toBeGreaterThan(0);
  });
});

describe("eventsActiveOnLocalDate", () => {
  it("counts only confirmed overlaps on local today", () => {
    const today = new Date(2026, 4, 11);
    const confirmed = sampleEvent({
      id: "c",
      status: "confirmed",
      startDay: 10,
      endDay: 12,
    });
    expect(eventsActiveOnLocalDate([confirmed], today)).toHaveLength(1);
  });

  it("does not treat pending spans as occupying the property", () => {
    const today = new Date(2026, 4, 11);
    const pending = sampleEvent({
      status: "pending",
      startDay: 10,
      endDay: 12,
    });
    expect(eventsActiveOnLocalDate([pending], today)).toHaveLength(0);
  });
});

describe("findEventOverlappingRange", () => {
  it("detects overlap", () => {
    const hit = findEventOverlappingRange([sampleEvent()], 11, 14);
    expect(hit?.id).toBe("e1");
  });
});
