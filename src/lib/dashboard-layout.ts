import { cn } from "@/lib/utils";

/**
 * Dashboard main column: reserves space for the fixed app header.
 * Do not add `pt-*` on the same element — it overrides this offset in tailwind-merge.
 */
export const AR_DASHBOARD_MAIN_BASE =
  "ar-dashboard-main min-w-0 flex-1 overflow-x-hidden pt-[var(--ar-header-height)]";

/** Horizontal + bottom safe-area chrome for the home route (no top — use AR_PAGE_BODY_*). */
export const AR_PAGE_CHROME_HOME =
  "mx-auto w-full max-w-[1180px] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-10 lg:px-12 lg:pb-12";

/** Default page chrome for feed, calendar, guide, etc. */
export const AR_PAGE_CHROME_STANDARD =
  "mx-auto w-full max-w-[1400px] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-8 lg:px-10 lg:pb-10";

/** Breathing room below the header — match standard tab top gap on mobile. */
export const AR_PAGE_BODY_HOME = "min-w-0 pt-3 sm:pt-5 lg:pt-4";

/** Standard section stack below the header. */
export const AR_PAGE_BODY_STANDARD = "min-w-0 space-y-7 pt-3 sm:space-y-6 sm:pt-4";

export function cnDashboardMain(isHome: boolean): string {
  return cn(AR_DASHBOARD_MAIN_BASE, isHome ? AR_PAGE_CHROME_HOME : AR_PAGE_CHROME_STANDARD);
}

export function cnDashboardPageBody(isHome: boolean): string {
  return isHome ? AR_PAGE_BODY_HOME : AR_PAGE_BODY_STANDARD;
}
