import type { AlbumMediaItem } from "@/lib/photo-album-media";
import type { UiFeedPost } from "@/models/feed-post";

export function isEphemeralHandoffUrl(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith("blob:") || url?.startsWith("data:"));
}

/**
 * Clones blob:/data: URLs so composers can revoke their object URLs without breaking
 * optimistic feed/album tiles that still reference the image.
 */
export async function handoffEphemeralImageUrl(url: string | null): Promise<string | null> {
  if (url == null || url === "") return null;
  if (!isEphemeralHandoffUrl(url)) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return url;
  }
}

export async function handoffEphemeralImageUrlList(urls: readonly (string | null)[]): Promise<(string | null)[]> {
  return Promise.all(Array.from(urls, (u) => handoffEphemeralImageUrl(u)));
}

export function revokeHandoffImageUrl(url: string | null | undefined): void {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

/** Revoke optimistic local media on a feed row (cover + album slots). */
export function revokeUiFeedPostHandoffMedia(post: UiFeedPost): void {
  if (post.cover) revokeHandoffImageUrl(post.cover);
  post.album?.forEach((u) => revokeHandoffImageUrl(u));
}

export function revokeAlbumItemHandoffSrc(item: AlbumMediaItem): void {
  revokeHandoffImageUrl(item.src);
}
