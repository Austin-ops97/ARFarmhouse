import { describe, expect, it } from "vitest";

import {
  canAdminDeleteBooking,
  canApproveBookings,
  canDeleteAnyFeedPost,
  canDeleteBooking,
  canDeleteFeedPost,
  canEditBooking,
  canManageBlackoutDates,
  canRemoveOwnBooking,
  isAdmin,
  isBookingOwner,
} from "@/lib/permissions";
import type { Booking } from "@/models/booking";
import type { PermissionUser } from "@/platform/permissions";

const user = { uid: "user-1", role: "user" as const };
const admin = { uid: "admin-1", role: "admin" as const };
/** Legacy Firestore profiles may still store `owner` until migrated. */
const legacyOwnerRole = { role: "owner" };
const legacyOwnerUser = { uid: "owner-1", role: "owner" };

const booking: Pick<Booking, "createdBy"> = { createdBy: "user-1" };
const otherBooking: Pick<Booking, "createdBy"> = { createdBy: "other-1" };

describe("permissions", () => {
  it("treats admin and legacy owner as admins", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(legacyOwnerRole)).toBe(true);
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

  it("allows owners and admins to edit bookings", () => {
    expect(canEditBooking(user, booking)).toBe(true);
    expect(canEditBooking(user, otherBooking)).toBe(false);
    expect(canEditBooking(admin, otherBooking)).toBe(true);
  });

  it("splits owner remove vs admin delete", () => {
    expect(canRemoveOwnBooking(user, booking)).toBe(true);
    expect(canRemoveOwnBooking(user, otherBooking)).toBe(false);
    expect(canAdminDeleteBooking(admin)).toBe(true);
    expect(canAdminDeleteBooking(user)).toBe(false);
    expect(canDeleteBooking(admin, otherBooking)).toBe(true);
    expect(canDeleteBooking(user, otherBooking)).toBe(false);
  });

  it("allows feed post authors and admins to delete posts", () => {
    const ownPost = { authorId: "user-1" };
    const otherPost = { authorId: "other-1" };

    expect(canDeleteFeedPost(user, ownPost)).toBe(true);
    expect(canDeleteFeedPost(user, otherPost)).toBe(false);
    expect(canDeleteFeedPost(admin, otherPost)).toBe(true);
    expect(canDeleteFeedPost(legacyOwnerUser as unknown as PermissionUser, otherPost)).toBe(true);
    expect(canDeleteAnyFeedPost(user)).toBe(false);
    expect(canDeleteAnyFeedPost(admin)).toBe(true);
    expect(canDeleteFeedPost(null, ownPost)).toBe(false);
    expect(canDeleteFeedPost(user, { authorId: "" })).toBe(false);
  });
});
