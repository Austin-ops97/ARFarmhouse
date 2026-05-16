/** Max logical width for sizing math (`max-w-*` stays in Tailwind separately). */
export const FEED_STREAM_MAX_WIDTH_PX = 520;

/** Center stream — Instagram / Threads–like readable width (not stretched) */
export const FEED_STREAM_CLASS =
  "w-full min-w-0 max-w-[min(100%,520px)] mx-auto shrink-0";

/** Outer wrapper when rail is shown */
export const FEED_LAYOUT_CLASS =
  "mx-auto flex w-full min-w-0 max-w-[min(100%,1580px)] flex-col gap-8 overflow-x-hidden lg:flex-row lg:items-start lg:justify-center lg:gap-10 xl:gap-14";

/** Right contextual column */
export const FEED_RAIL_CLASS = "hidden w-full min-w-0 max-w-[300px] shrink-0 xl:block";

/** Mobile edge-bleed for media (pairs with dashboard `px-4` / `sm:px-6`) */
export const FEED_MEDIA_BLEED = "-mx-4 sm:mx-0";

/** Next/Image sizes — tuned to ~520px stream */
export const FEED_IMAGE_SIZES =
  "(max-width: 639px) 100vw, (max-width: 1023px) 520px, (max-width: 1279px) 520px, 560px";
