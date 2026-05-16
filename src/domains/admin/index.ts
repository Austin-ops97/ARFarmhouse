/**
 * Admin domain — moderation, settings, analytics foundations.
 */

export { AdminView } from "@/components/ar-farmhouse/admin-view";
export { AdminModerationView } from "@/components/ar-farmhouse/admin-moderation-view";
export { AdminSettingsView } from "@/components/ar-farmhouse/admin-settings-view";
export { AdminOverviewView } from "@/components/ar-farmhouse/admin-overview-view";
export {
  computeAdminDashboardStats,
  type AdminDashboardStats,
} from "@/services/admin-analytics";
export {
  canAccessAdmin,
  canViewAdminAnalytics,
  canApproveBookings,
} from "@/platform/permissions";
