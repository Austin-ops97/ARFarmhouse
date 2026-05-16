import type { AlbumMediaItem } from "@/lib/photo-album-media";
import type { UiFeedPost } from "@/models/feed-post";

import { mobileUploadLog } from "@/lib/mobile-upload-debug";

export function isEphemeralHandoffUrl(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith("blob:") || url?.startsWith("data:"));
}

/**
 * Prefer this on mobile: a second object URL for the same {@link File} avoids `fetch(blob:)` cloning
 * (Safari would duplicate the image in RAM).
 */
export function handoffEphemeralImageFromFile(file: File | null | undefined): string | null {
  if (!file) return null;
  mobileUploadLog("optimistic preview URL from File (no blob fetch clone)", {
    bytes: file.size,
    type: file.type || guessMimeFromName(file.name),
  });
  return URL.createObjectURL(file);
}

function guessMimeFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".heic") || n.endsWith(".heif")) return "image/heic";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

/**
 * Clones blob:/data: URLs so composers can revoke their object URLs without breaking
 * optimistic feed/album tiles that still reference the image.
 *
 * **Important:** For blob URLs backed by a {@link File}, use {@link handoffEphemeralImageFromFile}
 * instead — Safari duplicates memory when using `fetch(blob:)`.
 */
export async function handoffEphemeralImageUrl(url: string | null): Promise<string | null> {
  if (url == null || url === "") return null;
  if (!isEphemeralHandoffUrl(url)) return url;
  mobileUploadLog("handoff cloning ephemeral URL via fetch (avoid when File is available)", {
    scheme: url.startsWith("data:") ? "data" : "blob",
  });
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
