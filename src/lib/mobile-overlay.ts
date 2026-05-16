import { cn } from "@/lib/utils";

/**
 * Constrains overlay hosts to the small viewport on phones (Safari toolbar visible).
 * Desktop resets to full `inset-0` via globals.css media query.
 */
export const AR_OVERLAY_VIEWPORT = "ar-overlay-viewport";

/** Bottom-anchored sheet host — action menus, forms, pickers. */
export const AR_BOTTOM_SHEET_HOST = cn(
  AR_OVERLAY_VIEWPORT,
  "fixed inset-x-0 top-0 z-[70] flex flex-col justify-end",
  "pb-[var(--ar-overlay-bottom)]",
  "sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-5 sm:pb-5"
);

/** Centered dialog host — confirmations and compact modals on all breakpoints. */
export const AR_CENTERED_MODAL_HOST = cn(
  AR_OVERLAY_VIEWPORT,
  "fixed inset-x-0 top-0 z-[70] flex items-center justify-center",
  "px-4 pb-[var(--ar-overlay-bottom)] pt-[var(--ar-overlay-top)]",
  "sm:inset-0 sm:p-5 sm:pt-5"
);

/** Full-screen overlay (lightboxes) — respects safe areas on phones. */
export const AR_FULLSCREEN_OVERLAY = cn(
  AR_OVERLAY_VIEWPORT,
  "fixed inset-x-0 top-0 z-[100] flex flex-col",
  "pb-[var(--ar-overlay-bottom)] pt-[var(--ar-overlay-top)]",
  "sm:inset-0 sm:pb-0 sm:pt-0"
);

/** @deprecated Use {@link AR_BOTTOM_SHEET_HOST} — kept for existing imports. */
export const AR_OVERLAY_HOST = AR_BOTTOM_SHEET_HOST;

/** Scrim behind sheets/dialogs. */
export const AR_OVERLAY_SCRIM = "ar-scrim absolute inset-0 touch-manipulation";

/**
 * Mobile-first sheet shell: capped height, internal scroll, safe areas.
 * Pair with AR_SHEET_HEADER / AR_SHEET_BODY / AR_SHEET_FOOTER.
 */
export const AR_MOBILE_SHEET = cn(
  "ar-modal-shell relative z-10 flex w-full max-w-lg min-h-0 flex-col overflow-hidden touch-manipulation",
  "max-h-[var(--ar-sheet-max-height)]",
  "rounded-t-[1.75rem] sm:max-h-[min(92svh,920px)] sm:rounded-[1.75rem]"
);

/** Compact action sheet (image picker, share, quick menus). */
export const AR_ACTION_SHEET = cn(
  "ar-modal-shell relative z-10 w-full max-w-md min-h-0 overflow-hidden touch-manipulation",
  "max-h-[min(70svh,var(--ar-sheet-max-height))]",
  "rounded-t-[1.75rem] sm:max-h-[min(85svh,640px)] sm:rounded-[1.75rem]"
);

export const AR_SHEET_HEADER = cn(
  "shrink-0 border-b border-border/50 px-5 py-4 dark:border-white/[0.06] sm:px-5 sm:py-3.5",
  "pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:pt-4"
);

export const AR_SHEET_BODY =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4 sm:px-5";

export const AR_SHEET_FOOTER = cn(
  "shrink-0 border-t border-border/50 bg-background/80 px-5 py-3.5 backdrop-blur-xl dark:border-white/[0.06]",
  "pb-[var(--ar-overlay-bottom)] sm:px-5 sm:py-3"
);

/** Side panel on sm+ (notifications) — full height below app header. */
export const AR_SIDE_PANEL_SHEET = cn(
  "ar-modal-shell relative z-10 flex min-h-0 w-full max-w-lg flex-col overflow-hidden",
  "max-h-[var(--ar-sheet-max-height)] rounded-t-[1.75rem]",
  "sm:mt-[var(--ar-header-height)] sm:h-[calc(100dvh-var(--ar-header-height))] sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0"
);

/** Account menu — viewport-safe on phones (not `absolute` under header). */
export const AR_ACCOUNT_MENU = cn(
  "z-[80] overflow-hidden rounded-2xl border border-border/60 bg-popover/95 py-1 shadow-lg backdrop-blur-2xl",
  "dark:border-white/12 dark:bg-background/95 dark:shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)]",
  "fixed right-3 top-[calc(var(--ar-header-height)+0.28rem)] w-[min(17rem,calc(100vw-1.5rem))]",
  "max-h-[min(16rem,calc(100svh-var(--ar-header-height)-var(--ar-overlay-bottom)-0.75rem))]",
  "sm:right-4 sm:w-52"
);
