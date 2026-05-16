import { describe, expect, it } from "vitest";

import {
  findOverlappingApprovedBookings,
  findOverlappingBlackout,
  resolveBookingCreateConflict,
} from "@/lib/booking-conflict-engine";
import type { BlackoutDate, Booking } from "@/models/booking";

function booking(partial: Partial<Booking> & Pick<Booking, "id" | "startDate" | "endDate" | "status">): Booking {
  return {
    id: partial.id,
    title: partial.title ?? "Stay",
    description: "",
    type: partial.type ?? "booking",
    startDate: partial.startDate,
    endDate: partial.endDate,
    status: partial.status,
    createdBy: "u1",
    createdByName: "Member",
    approvedBy: null,
    approvedAt: null,
    deniedReason: null,
    conflictsWith: [],
    createdAt: null,
    updatedAt: null,
    calendarEventId: null,
    legacyBookingRequestId: null,
    activityLog: [],
    deleted: false,
    deletedAt: null,
    deletedBy: null,
    deletedReason: null,
  };
}

describe("resolveBookingCreateConflict", () => {
  const rangeStart = new Date(2026, 4, 10, 0, 0, 0, 0);
  const rangeEnd = new Date(2026, 4, 12, 23, 59, 59, 999);

  it("blocks when overlapping a blackout", () => {
    const blackouts: BlackoutDate[] = [
      {
        id: "b1",
        title: "Roof work",
        reason: "Contractors",
        startDate: new Date(2026, 4, 9),
        endDate: new Date(2026, 4, 11, 23, 59, 59, 999),
        createdBy: "admin",
        createdAt: null,
      },
    ];
    const result = resolveBookingCreateConflict(blackouts, [], rangeStart, rangeEnd);
    expect(result.blocked).toBe(true);
    if (result.blocked) expect(result.blackout.id).toBe("b1");
  });

  it("flags pending_conflict when overlapping approved booking", () => {
    const existing = [
      booking({
        id: "a1",
        status: "approved",
        startDate: new Date(2026, 4, 8),
        endDate: new Date(2026, 4, 14, 23, 59, 59, 999),
      }),
    ];
    const result = resolveBookingCreateConflict([], existing, rangeStart, rangeEnd);
    expect(result).toEqual({ blocked: false, status: "pending_conflict", conflictsWith: ["a1"] });
  });

  it("returns pending when no conflicts", () => {
    const existing = [
      booking({
        id: "p1",
        status: "pending",
        startDate: new Date(2026, 4, 8),
        endDate: new Date(2026, 4, 14, 23, 59, 59, 999),
      }),
    ];
    const result = resolveBookingCreateConflict([], existing, rangeStart, rangeEnd);
    expect(result).toEqual({ blocked: false, status: "pending", conflictsWith: [] });
  });
});

describe("findOverlappingApprovedBookings", () => {
  it("ignores denied and pending stays", () => {
    const rows = [
      booking({ id: "d", status: "denied", startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 5) }),
      booking({ id: "p", status: "pending", startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 5) }),
    ];
    const hits = findOverlappingApprovedBookings(
      rows,
      new Date(2026, 0, 2),
      new Date(2026, 0, 3)
    );
    expect(hits).toHaveLength(0);
  });
});

describe("findOverlappingBlackout", () => {
  it("returns first overlapping blackout", () => {
    const blackouts: BlackoutDate[] = [
      {
        id: "x",
        title: "Closed",
        reason: "",
        startDate: new Date(2026, 2, 1),
        endDate: new Date(2026, 2, 31, 23, 59, 59, 999),
        createdBy: "admin",
        createdAt: null,
      },
    ];
    expect(
      findOverlappingBlackout(blackouts, new Date(2026, 2, 15), new Date(2026, 2, 16))?.id
    ).toBe("x");
  });
});
