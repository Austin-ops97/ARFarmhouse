import type { Booking } from "@/models/booking";
import type { AppUser } from "@/models/user";
import { normalizeUserRole } from "@/models/user";

import {
  hasCapability,
  normalizePlatformRole,
  type Capability,
  type PlatformRole,
} from "./capabilities";

export type { Capability, PlatformRole };
export {
  capabilitiesForRole,
  hasAllCapabilities,
  hasAnyCapability,
  hasCapability,
  normalizePlatformRole,
} from "./capabilities";

export type RoleCarrier = { role?: unknown } | null | undefined;
export type PermissionUser = Pick<AppUser, "uid" | "role"> | null | undefined;
export type PermissionBooking = Pick<Booking, "createdBy"> | null | undefined;

export function isAdmin(user: RoleCarrier): boolean {
  return hasCapability(user?.role, "admin.access");
}

export function isBookingOwner(user: PermissionUser, booking: PermissionBooking): boolean {
  if (!user?.uid || !booking?.createdBy) return false;
  return user.uid === booking.createdBy;
}

export function canApproveBookings(user: PermissionUser): boolean {
  return hasCapability(user?.role, "bookings.approve");
}

export function canEditBooking(user: PermissionUser, booking: PermissionBooking): boolean {
  if (!user || !booking) return false;
  return (
    hasCapability(user.role, "bookings.edit_any") || isBookingOwner(user, booking)
  );
}

/** Owner may remove their own booking (soft delete). */
export function canRemoveOwnBooking(user: PermissionUser, booking: PermissionBooking): boolean {
  return isBookingOwner(user, booking);
}

/** Admin override — remove any booking with optional reason. */
export function canAdminDeleteBooking(user: PermissionUser): boolean {
  return (
    hasCapability(user?.role, "bookings.delete_any") ||
    hasCapability(user?.role, "bookings.approve")
  );
}

/** @deprecated Prefer canRemoveOwnBooking or canAdminDeleteBooking */
export function canDeleteBooking(user: PermissionUser, booking: PermissionBooking): boolean {
  return canRemoveOwnBooking(user, booking) || canAdminDeleteBooking(user);
}

export function canManageBlackoutDates(user: PermissionUser): boolean {
  return hasCapability(user?.role, "bookings.manage_blackouts");
}

export function canAccessAdmin(user: PermissionUser): boolean {
  return hasCapability(user?.role, "admin.access");
}

export function canViewAdminAnalytics(user: PermissionUser): boolean {
  return hasCapability(user?.role, "admin.analytics");
}

export function canModerateFeed(user: PermissionUser): boolean {
  return hasCapability(user?.role, "feed.moderate");
}

export type PermissionFeedPost = { authorId: string } | null | undefined;

/** Admins and legacy owners may delete any feed post. */
export function canDeleteAnyFeedPost(user: PermissionUser): boolean {
  return hasCapability(user?.role, "feed.delete_any");
}

/** Post author or platform moderator/admin may delete a feed post. */
export function canDeleteFeedPost(user: PermissionUser, post: PermissionFeedPost): boolean {
  if (!user?.uid || !post?.authorId) return false;
  if (user.uid === post.authorId) return true;
  return canDeleteAnyFeedPost(user);
}

/** App-facing role label (binary today; expand when UI needs role labels). */
export function displayRole(user: RoleCarrier): "admin" | "user" {
  return normalizeUserRole(user?.role);
}

export function platformRole(user: RoleCarrier): PlatformRole {
  return normalizePlatformRole(user?.role);
}
