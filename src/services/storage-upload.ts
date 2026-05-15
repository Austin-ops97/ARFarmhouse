import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { actionDebug } from "@/lib/action-debug";
import { FEED_IMAGE_MAX_BYTES } from "@/lib/feed-publish";
import { tryGetFirebaseStorage } from "@/lib/firebase";

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "img";
}

export async function uploadPostImages(
  postId: string,
  files: File[],
  onProgress?: (done: number, total: number) => void
) {
  const storage = tryGetFirebaseStorage();
  if (!storage) throw new Error("Firebase Storage unavailable. Check your connection and try again.");

  const urls: string[] = [];
  const total = files.length;
  actionDebug("upload", "start", { postId, total });

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    if (file.size > FEED_IMAGE_MAX_BYTES) {
      throw new Error(`"${file.name}" exceeds the 10 MB limit.`);
    }
    const ext = extFromMime(file.type || "image/jpeg");
    const objectRef = ref(storage, `posts/${postId}/${Date.now()}-${i}.${ext}`);
    try {
      await uploadBytes(objectRef, file, { contentType: file.type || "image/jpeg" });
      const url = await getDownloadURL(objectRef);
      urls.push(url);
      actionDebug("upload", `file ${i + 1}/${total} complete`);
    } catch (e) {
      actionDebug("upload", `file ${i + 1}/${total} failed`, e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("unauthorized") || msg.includes("permission")) {
        throw new Error("Image upload was denied. Sign in again and check Storage rules.");
      }
      throw new Error(`Could not upload "${file.name}". ${msg}`);
    }
    onProgress?.(i + 1, total);
  }

  actionDebug("upload", "complete", { count: urls.length });
  return urls;
}

export type UploadedObject = { url: string; path: string };

export async function uploadAlbumImages(
  mediaId: string,
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<UploadedObject[]> {
  const storage = tryGetFirebaseStorage();
  if (!storage) throw new Error("Firebase Storage unavailable. Check your connection and try again.");

  const out: UploadedObject[] = [];
  const total = files.length;
  actionDebug("upload", "album start", { mediaId, total });

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    if (file.size > FEED_IMAGE_MAX_BYTES) {
      throw new Error(`"${file.name}" exceeds the 10 MB limit.`);
    }
    const ext = extFromMime(file.type || "image/jpeg");
    const path = `albums/${mediaId}/${Date.now()}-${i}.${ext}`;
    const objectRef = ref(storage, path);
    try {
      await uploadBytes(objectRef, file, { contentType: file.type || "image/jpeg" });
      const url = await getDownloadURL(objectRef);
      out.push({ url, path });
    } catch (e) {
      actionDebug("upload", `album file ${i + 1}/${total} failed`, e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("unauthorized") || msg.includes("permission")) {
        throw new Error("Album upload was denied. Sign in again and check Storage rules.");
      }
      throw new Error(`Could not upload "${file.name}". ${msg}`);
    }
    onProgress?.(i + 1, total);
  }

  return out;
}

/** Best-effort delete by Storage object path (e.g. `posts/abc/123.jpg`). */
export async function deleteStoragePath(storagePath: string) {
  const storage = tryGetFirebaseStorage();
  if (!storage || !storagePath.trim()) return;
  await deleteObject(ref(storage, storagePath));
}

/** Delete all objects under a feed post prefix. */
export async function deletePostMediaStorage(postId: string, mediaUrls: string[]) {
  const storage = tryGetFirebaseStorage();
  if (!storage) return;
  const paths = new Set<string>();
  for (const url of mediaUrls) {
    try {
      const path = decodeURIComponent(
        url.split("/o/")[1]?.split("?")[0] ?? ""
      );
      if (path) paths.add(path);
    } catch {
      /* ignore malformed */
    }
  }
  if (paths.size === 0) {
    actionDebug("upload", "delete post media — no paths parsed", { postId, count: mediaUrls.length });
    return;
  }
  await Promise.allSettled([...paths].map((p) => deleteObject(ref(storage, p))));
}

export async function uploadAvatar(uid: string, file: File) {
  const storage = tryGetFirebaseStorage();
  if (!storage) throw new Error("Firebase Storage unavailable");
  const ext = extFromMime(file.type || "image/jpeg");
  const objectRef = ref(storage, `avatars/${uid}/profile.${ext}`);
  await uploadBytes(objectRef, file, { contentType: file.type || "image/jpeg" });
  return getDownloadURL(objectRef);
}
