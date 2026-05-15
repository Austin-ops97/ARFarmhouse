import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

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

export async function uploadAvatar(uid: string, file: File) {
  const storage = tryGetFirebaseStorage();
  if (!storage) throw new Error("Firebase Storage unavailable");
  const ext = extFromMime(file.type || "image/jpeg");
  const objectRef = ref(storage, `avatars/${uid}/profile.${ext}`);
  await uploadBytes(objectRef, file, { contentType: file.type || "image/jpeg" });
  return getDownloadURL(objectRef);
}
