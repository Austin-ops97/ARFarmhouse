/** Canonical origin for share links (prefer env in production). */
export function getPublicSiteOrigin(): string {
  const fromEnv =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SITE_URL?.trim() : undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function buildPostDeepLink(postId: string): string {
  const origin = getPublicSiteOrigin();
  if (!origin) return "";
  const path = typeof window !== "undefined" ? window.location.pathname || "/" : "/";
  const url = new URL(path, origin);
  url.searchParams.set("post", postId);
  return url.toString();
}
