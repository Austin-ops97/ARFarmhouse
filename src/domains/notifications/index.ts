/**
 * Notifications domain — inbox, routes, booking fanout.
 */

export { NotificationsProvider, useNotifications } from "@/contexts/notifications-context";
export type { FamilyNotification, NotificationType } from "@/models/notification";
export {
  subscribeNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/notifications";
export { navigationTargetFromNotification } from "@/lib/notification-routes";
