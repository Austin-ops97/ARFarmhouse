import { describe, expect, it } from "vitest";

import {
  canApproveBookings,
  canDeleteBooking,
  canEditBooking,
  canManageBlackoutDates,
  isAdmin,
  isBookingOwner,
} from "@/lib/permissions";
import type { Booking } from "@/models/booking";

const user = { uid: "user-1", role: "user" as const };
const admin = { uid: "admin-1", role: "admin" as const };
/** Legacy Firestore profiles may still store `owner` until migrated. */
const legacyOwner = { role: "owner" };

const booking: Pick<Booking, "createdBy"> = { createdBy: "user-1" };
const otherBooking: Pick<Booking, "createdBy"> = { createdBy: "other-1" };

describe("permissions", () => {
  it("treats admin and legacy owner as admins", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(legacyOwner)).toBe(true);
    expect(isAdmin(user)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("grants booking ownership to creators only", () => {
    expect(isBookingOwner(user, booking)).toBe(true);
    expect(isBookingOwner(user, otherBooking)).toBe(false);
  });

  it("allows admins to approve and manage blackouts", () => {
    expect(canApproveBookings(admin)).toBe(true);
    expect(canApproveBookings(user)).toBe(false);
    expect(canManageBlackoutDates(admin)).toBe(true);
    expect(canManageBlackoutDates(user)).toBe(false);
  });

  it("allows owners and admins to edit or delete bookings", () => {
    expect(canEditBooking(user, booking)).toBe(true);
    expect(canEditBooking(user, otherBooking)).toBe(false);
    expect(canEditBooking(admin, otherBooking)).toBe(true);
    expect(canDeleteBooking(admin, otherBooking)).toBe(true);
  });
});
