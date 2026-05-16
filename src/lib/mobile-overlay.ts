import { cn } from "@/lib/utils";

/** Full-screen overlay host — bottom sheet on mobile, centered on sm+. */
export const AR_OVERLAY_HOST =
  "fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-5";

/** Scrim behind sheets/dialogs. */
export const AR_OVERLAY_SCRIM = "ar-scrim absolute inset-0 touch-manipulation";

/**
 * Mobile-first sheet shell: capped height, internal scroll, safe areas.
 * Pair with AR_SHEET_HEADER / AR_SHEET_BODY / AR_SHEET_FOOTER.
 */
export const AR_MOBILE_SHEET = cn(
  "ar-modal-shell relative z-10 flex w-full max-w-lg min-h-0 flex-col overflow-hidden touch-manipulation",
  "max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-bottom,0px)))]",
  "rounded-t-[1.75rem] sm:max-h-[min(92dvh,920px)] sm:rounded-[1.75rem]"
);

export const AR_SHEET_HEADER =
  "shrink-0 border-b border-border/50 px-5 py-4 dark:border-white/[0.06] sm:px-5 sm:py-3.5";

export const AR_SHEET_BODY =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4 sm:px-5";

export const AR_SHEET_FOOTER = cn(
  "shrink-0 border-t border-border/50 bg-background/80 px-5 py-3.5 backdrop-blur-xl dark:border-white/[0.06]",
  "pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-3"
);

/** Side panel on sm+ (notifications) — full height below app header. */
export const AR_SIDE_PANEL_SHEET = cn(
  "ar-modal-shell relative z-10 flex min-h-0 w-full max-w-lg flex-col overflow-hidden",
  "max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-bottom,0px)))] rounded-t-[1.75rem]",
  "sm:mt-[var(--ar-header-height)] sm:h-[calc(100dvh-var(--ar-header-height))] sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0"
);

/** Account menu — viewport-safe on phones (not `absolute` under header). */
export const AR_ACCOUNT_MENU = cn(
  "z-[80] overflow-hidden rounded-2xl border border-border/60 bg-popover/95 py-1 shadow-lg backdrop-blur-2xl",
  "dark:border-white/12 dark:bg-background/95 dark:shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)]",
  "fixed right-3 top-[calc(var(--ar-header-height)+0.28rem)] w-[min(17rem,calc(100vw-1.5rem))]",
  "max-h-[min(16rem,calc(100dvh-var(--ar-header-height)-env(safe-area-inset-bottom,0px)-0.75rem))]",
  "sm:right-4 sm:w-52"
);
