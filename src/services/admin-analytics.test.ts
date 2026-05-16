import { describe, expect, it } from "vitest";

import type { Booking } from "@/models/booking";
import { computeAdminDashboardStats } from "@/services/admin-analytics";

function booking(partial: Partial<Booking> & Pick<Booking, "id" | "status">): Booking {
  const now = new Date("2026-05-16T12:00:00Z");
  return {
    id: partial.id,
    title: "",
    description: "",
    type: "booking",
    startDate: partial.startDate ?? now,
    endDate: partial.endDate ?? new Date(now.getTime() + 86400000),
    status: partial.status,
    createdBy: "u1",
    createdByName: "Test",
    approvedBy: null,
    approvedAt: null,
    deniedReason: null,
    conflictsWith: partial.conflictsWith ?? [],
    createdAt: now,
    updatedAt: now,
    calendarEventId: null,
    legacyBookingRequestId: null,
    activityLog: [],
    deleted: partial.deleted ?? false,
    deletedAt: null,
    deletedBy: null,
    deletedReason: null,
  };
}

describe("computeAdminDashboardStats", () => {
  it("aggregates moderation queue and conflicts", () => {
    const stats = computeAdminDashboardStats(
      [
        booking({ id: "1", status: "pending" }),
        booking({ id: "2", status: "pending_conflict", conflictsWith: ["x"] }),
        booking({
          id: "3",
          status: "approved",
          endDate: new Date("2026-06-01"),
        }),
      ],
      { now: new Date("2026-05-16") }
    );

    expect(stats.moderation.queueDepth).toBe(2);
    expect(stats.bookings.pending).toBe(1);
    expect(stats.bookings.pendingConflict).toBe(1);
    expect(stats.bookings.upcomingApproved).toBe(1);
    expect(stats.conflicts.bookingsWithConflicts).toBe(1);
  });
});
