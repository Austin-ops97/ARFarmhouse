export type FeedPostCategory =
  | "memory"
  | "update"
  | "event"
  | "wildlife"
  | "project"
  | "weekend_recap"
  | "poll";

/** Discriminator for standard media/text posts vs interactive polls. */
export type FeedPostContentType = "standard" | "poll";

export const POLL_OPTION_MIN = 2;
export const POLL_OPTION_MAX = 6;
