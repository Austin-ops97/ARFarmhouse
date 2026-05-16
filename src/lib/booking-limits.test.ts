import { describe, expect, it } from "vitest";

import { validateBookingLimits } from "@/lib/booking-limits";
import { DEFAULT_BOOKING_LIMITS } from "@/models/system-settings";

describe("validateBookingLimits", () => {
  const now = new Date("2026-05-16T12:00:00Z");

  it("allows a valid booking", () => {
    const start = new Date("2026-06-01");
    const end = new Date("2026-06-05");
    const result = validateBookingLimits({
      limits: DEFAULT_BOOKING_LIMITS,
      start,
      end,
      now,
      userId: "u1",
      userBookings: [],
    });
    expect(result).toBeNull();
  });

  it("blocks when duration exceeds max", () => {
    const start = new Date("2026-06-01");
    const end = new Date("2026-06-20");
    const result = validateBookingLimits({
      limits: DEFAULT_BOOKING_LIMITS,
      start,
      end,
      now,
      userId: "u1",
      userBookings: [],
    });
    expect(result?.code).toBe("max_duration");
  });

  it("allows same-day booking when minimum notice is zero", () => {
    const start = new Date("2026-05-16T00:00:00Z");
    const end = new Date("2026-05-17T00:00:00Z");
    const result = validateBookingLimits({
      limits: { ...DEFAULT_BOOKING_LIMITS, minNoticeHours: 0 },
      start,
      end,
      now,
      userId: "u1",
      userBookings: [],
    });
    expect(result).toBeNull();
  });

  it("blocks when arrival is sooner than minimum notice", () => {
    const start = new Date("2026-05-17T00:00:00Z");
    const end = new Date("2026-05-18T00:00:00Z");
    const result = validateBookingLimits({
      limits: { ...DEFAULT_BOOKING_LIMITS, minNoticeHours: 24 },
      start,
      end,
      now,
      userId: "u1",
      userBookings: [],
    });
    expect(result?.code).toBe("min_notice");
  });

  it("blocks when too many pending", () => {
    const start = new Date("2026-06-10");
    const end = new Date("2026-06-12");
    const pending = Array.from({ length: 5 }, (_, i) => ({
      status: "pending" as const,
      createdBy: "u1",
      startDate: new Date(`2026-07-${i + 1}`),
      endDate: new Date(`2026-07-${i + 2}`),
    }));
    const result = validateBookingLimits({
      limits: { ...DEFAULT_BOOKING_LIMITS, maxActiveBookingsPerUser: 10 },
      start,
      end,
      now,
      userId: "u1",
      userBookings: pending,
    });
    expect(result?.code).toBe("max_pending");
  });
});
