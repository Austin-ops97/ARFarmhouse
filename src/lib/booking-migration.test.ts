import { describe, expect, it } from "vitest";

import {
  bookingFromLegacyCalendarEvent,
  bookingStatusToCalendarStatus,
  bookingToCalendarEvent,
  calendarStatusToBookingStatus,
} from "@/lib/booking-migration";

describe("booking-migration", () => {
  it("maps approval statuses between unified and calendar models", () => {
    expect(bookingStatusToCalendarStatus("approved")).toBe("confirmed");
    expect(bookingStatusToCalendarStatus("pending")).toBe("pending");
    expect(bookingStatusToCalendarStatus("denied")).toBe("cancelled");
    expect(calendarStatusToBookingStatus("confirmed")).toBe("approved");
    expect(calendarStatusToBookingStatus("cancelled")).toBe("cancelled");
  });

  it("builds unified bookings from legacy calendar events", () => {
    const booking = bookingFromLegacyCalendarEvent("evt-1", {
      title: "Family weekend",
      year: 2026,
      monthIndex: 4,
      startDay: 10,
      endDay: 12,
      status: "confirmed",
      requestedBy: "uid-1",
      requestedByName: "Alex",
      tripPurpose: "Relax",
      bookingRequestId: "req-1",
    });

    expect(booking.id).toBe("evt-1");
    expect(booking.status).toBe("approved");
    expect(booking.createdBy).toBe("uid-1");
    expect(booking.calendarEventId).toBe("evt-1");
    expect(booking.legacyBookingRequestId).toBe("req-1");
  });

  it("projects unified bookings back to month-scoped calendar events", () => {
    const startDate = new Date(2026, 4, 10);
    const endDate = new Date(2026, 4, 12);
    const event = bookingToCalendarEvent({
      id: "booking-1",
      title: "Stay",
      startDate,
      endDate,
      status: "approved",
      createdBy: "uid-1",
      createdByName: "Alex",
      description: "Notes",
      calendarEventId: "evt-1",
    });

    expect(event.id).toBe("evt-1");
    expect(event.startDay).toBe(10);
    expect(event.endDay).toBe(12);
    expect(event.status).toBe("confirmed");
    expect(event.year).toBe(2026);
    expect(event.monthIndex).toBe(4);
  });
});
