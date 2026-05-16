import { describe, expect, it } from "vitest";

import {
  bookingIsCalendarVisible,
  mergeBookingsAndBlackoutsForMonth,
} from "@/lib/calendar-booking-display";
import type { Booking } from "@/models/booking";

function sampleBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    title: "Weekend",
    description: "",
    type: "booking",
    startDate: new Date(2026, 4, 10),
    endDate: new Date(2026, 4, 12),
    status: "approved",
    createdBy: "u1",
    createdByName: "Alex",
    approvedBy: null,
    approvedAt: null,
    deniedReason: null,
    conflictsWith: [],
    createdAt: null,
    updatedAt: null,
    calendarEventId: "ev1",
    legacyBookingRequestId: null,
    activityLog: [],
    deleted: false,
    deletedAt: null,
    deletedBy: null,
    deletedReason: null,
    ...overrides,
  };
}

describe("bookingIsCalendarVisible", () => {
  it("hides denied, cancelled, and soft-deleted bookings", () => {
    expect(bookingIsCalendarVisible(sampleBooking())).toBe(true);
    expect(bookingIsCalendarVisible(sampleBooking({ status: "denied" }))).toBe(false);
    expect(bookingIsCalendarVisible(sampleBooking({ status: "cancelled" }))).toBe(false);
    expect(bookingIsCalendarVisible(sampleBooking({ deleted: true }))).toBe(false);
  });
});

describe("mergeBookingsAndBlackoutsForMonth", () => {
  it("omits denied bookings from calendar events", () => {
    const month = { year: 2026, monthIndex: 4, daysInMonth: 31, label: "May 2026" };
    const events = mergeBookingsAndBlackoutsForMonth(
      [
        sampleBooking({ id: "approved", status: "approved" }),
        sampleBooking({ id: "denied", status: "denied" }),
      ],
      [],
      month
    );
    expect(events.map((e) => e.bookingId)).toEqual(["approved"]);
  });
});
