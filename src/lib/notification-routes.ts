import type { FamilyNotification } from "@/models/notification";

/** Deep-link target for notification taps (used inside dashboard). */
export type NotificationNavigationTarget = {
  nav: FamilyNotification["route"]["nav"];
  postId?: string;
  eventId?: string;
};

export function navigationTargetFromNotification(n: FamilyNotification): NotificationNavigationTarget {
  return {
    nav: n.route.nav,
    postId: n.route.postId,
    eventId: n.route.eventId,
  };
}
