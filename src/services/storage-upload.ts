import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { tryGetFirebaseStorage } from "@/lib/firebase/client";

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "img";
}

export async function uploadPostImages(postId: string, files: File[], onProgress?: (done: number, total: number) => void) {
  const storage = tryGetFirebaseStorage();
  if (!storage) throw new Error("Firebase Storage unavailable");
  const urls: string[] = [];
  let i = 0;
  for (const file of files) {
    const ext = extFromMime(file.type || "image/jpeg");
    const objectRef = ref(storage, `posts/${postId}/${Date.now()}-${i}.${ext}`);
    await uploadBytes(objectRef, file, { contentType: file.type || "image/jpeg" });
    urls.push(await getDownloadURL(objectRef));
    i += 1;
    onProgress?.(i, files.length);
  }
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
