export type DeepLinkParams = {
  postId?: string;
  bookingId?: string;
  nav?: string;
};

/** Build an in-app deep link path (SPA uses query params on `/`). */
export function buildDeepLinkPath(params: DeepLinkParams, siteOrigin?: string): string {
  const base = siteOrigin?.replace(/\/$/, "") ?? "";
  const path = "/";
  const url = new URL(path, base || "https://placeholder.local");
  if (params.postId) url.searchParams.set("post", params.postId);
  else if (params.bookingId) url.searchParams.set("booking", params.bookingId);
  const relative = url.pathname + url.search;
  return base ? `${base}${relative}` : relative;
}
