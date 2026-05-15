import { describe, expect, it } from "vitest";

import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import { resolveHomeBookingSnapshot } from "@/lib/home-upcoming";

function mockEvent(overrides: Partial<PropertyCalendarEvent>): PropertyCalendarEvent {
  return {
    id: "e1",
    title: "Memorial weekend",
    startDay: 20,
    endDay: 22,
    kind: "family_booking",
    accent: "mint",
    status: "confirmed",
    guests: 4,
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

describe("resolveHomeBookingSnapshot", () => {
  it("returns empty when no events", () => {
    expect(resolveHomeBookingSnapshot([], new Date(2026, 4, 10))).toEqual({ kind: "empty" });
  });

  it("prefers active stay over future booking", () => {
    const now = new Date(2026, 4, 21, 12);
    const active = mockEvent({ id: "active", startDay: 20, endDay: 23 });
    const future = mockEvent({ id: "future", startDay: 28, endDay: 30, title: "Later trip" });
    const snap = resolveHomeBookingSnapshot([future, active], now);
    expect(snap.kind).toBe("active");
    if (snap.kind !== "empty") expect(snap.event.id).toBe("active");
  });

  it("returns next upcoming with countdown", () => {
    const now = new Date(2026, 4, 10);
    const snap = resolveHomeBookingSnapshot([mockEvent({ startDay: 20, endDay: 22 })], now);
    expect(snap.kind).toBe("upcoming");
    if (snap.kind !== "empty") {
      expect(snap.countdownLabel).toBe("10 days away");
      expect(snap.guestSummary).toContain("Alex");
    }
  });
});
