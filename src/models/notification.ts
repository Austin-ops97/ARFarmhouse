import type { Timestamp } from "firebase/firestore";

import type { NavId } from "@/components/ar-farmhouse/dashboard-nav";

export type NotificationType =
  | "booking_created"
  | "booking_submitted"
  | "booking_approved"
  | "booking_denied"
  | "booking_removed"
  | "booking_cancelled"
  | "blackout_affects_booking"
  | "admin_message"
  | "feed_comment"
  | "feed_reply"
  | "feed_reaction"
  | "trip_upcoming"
  | "task_created"
  | "property_update";

export type NotificationEntityKind =
  | "post"
  | "comment"
  | "calendarEvent"
  | "bookingRequest"
  | "booking"
  | "task";

export type NotificationRoute = {
  nav: NavId;
  postId?: string;
  eventId?: string;
  bookingId?: string;
};

export type FamilyNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  actorId: string;
  actorDisplayName: string;
  actorAvatarUrl: string | null;
  readAt: number | null;
  createdAt: number;
  /** Absolute or relative deep link for push / external open. */
  deepLink?: string;
  metadata?: Record<string, unknown> | null;
  entity: {
    kind: NotificationEntityKind;
    id: string;
    parentId?: string;
  };
  route: NotificationRoute;
  groupKey?: string;
};

export type FirestoreNotification = {
  type: NotificationType;
  title: string;
  body: string;
  actorId: string;
  actorDisplayName: string;
  actorAvatarUrl: string | null;
  readAt: Timestamp | null;
  createdAt: Timestamp;
  entityKind: NotificationEntityKind;
  entityId: string;
  entityParentId?: string | null;
  routeNav: NavId;
  routePostId?: string | null;
  routeEventId?: string | null;
  routeBookingId?: string | null;
  groupKey?: string | null;
  deepLink?: string | null;
  metadata?: Record<string, unknown> | null;
};
