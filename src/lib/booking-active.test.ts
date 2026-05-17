import { describe, expect, it } from "vitest";

import {
  bookingIsCalendarVisible,
  calendarEventIsUserVisible,
  isActiveBookingStatus,
} from "@/lib/booking-active";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";

function sampleEvent(
  partial: Partial<PropertyCalendarEvent> & Pick<PropertyCalendarEvent, "id">
): PropertyCalendarEvent {
  return {
    id: partial.id,
    title: partial.title ?? "Stay",
    startDay: partial.startDay ?? 10,
    endDay: partial.endDay ?? 12,
    kind: "family_booking",
    accent: "mint",
    status: partial.status ?? "pending",
    unifiedStatus: partial.unifiedStatus,
    guests: 2,
    tripId: "family",
    tripPurpose: "",
    notes: "",
    requestedBy: "u1",
    requestedByName: "Guest",
    attendeeLabels: [],
    attendeePetIds: [],
    year: 2026,
    monthIndex: 4,
  };
}

describe("booking-active", () => {
  it("treats pipeline statuses as active", () => {
    expect(isActiveBookingStatus("pending")).toBe(true);
    expect(isActiveBookingStatus("approved")).toBe(true);
    expect(isActiveBookingStatus("denied")).toBe(false);
    expect(isActiveBookingStatus("cancelled")).toBe(false);
  });

  it("hides denied bookings from calendar merge", () => {
    expect(bookingIsCalendarVisible({ status: "denied" })).toBe(false);
    expect(bookingIsCalendarVisible({ status: "approved" })).toBe(true);
  });

  it("hides cancelled and denied calendar events", () => {
    expect(calendarEventIsUserVisible(sampleEvent({ id: "c", status: "cancelled" }))).toBe(false);
    expect(
      calendarEventIsUserVisible(
        sampleEvent({ id: "d", status: "pending", unifiedStatus: "denied" })
      )
    ).toBe(false);
    expect(calendarEventIsUserVisible(sampleEvent({ id: "p", status: "pending" }))).toBe(true);
  });
});
