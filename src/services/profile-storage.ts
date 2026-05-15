import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { actionDebug } from "@/lib/action-debug";
import { tryGetFirebaseStorage } from "@/lib/firebase";

const PROFILE_MAX_BYTES = 6 * 1024 * 1024;

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "img";
}

function validateImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error(`"${file.name}" is not a supported image.`);
  }
  if (file.size > PROFILE_MAX_BYTES) {
    throw new Error(`"${file.name}" is too large. Keep profile photos under 6 MB.`);
  }
}

async function uploadPath(path: string, file: File): Promise<string> {
  const storage = tryGetFirebaseStorage();
  if (!storage) throw new Error("Storage unavailable. Check your connection and try again.");
  validateImage(file);
  const ext = extFromMime(file.type || "image/jpeg");
  const objectRef = ref(storage, `${path}.${ext}`);
  try {
    await uploadBytes(objectRef, file, { contentType: file.type || "image/jpeg" });
    const url = await getDownloadURL(objectRef);
    actionDebug("profile-upload", "complete", { path });
    return url;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("unauthorized") || msg.includes("permission")) {
      throw new Error("Photo upload was denied. Sign in again and check Storage rules.");
    }
    throw new Error("Could not upload that photo. Try again in a moment.");
  }
}

export async function uploadProfilePhoto(uid: string, file: File): Promise<string> {
  return uploadPath(`users/${uid}/profile/avatar`, file);
}

export async function uploadFamilyMemberPhoto(uid: string, memberId: string, file: File): Promise<string> {
  return uploadPath(`users/${uid}/family/${memberId}/photo`, file);
}

export async function uploadPetPhoto(uid: string, petId: string, file: File): Promise<string> {
  return uploadPath(`users/${uid}/pets/${petId}/photo`, file);
}

export async function removeStorageObject(pathPrefix: string): Promise<void> {
  const storage = tryGetFirebaseStorage();
  if (!storage) return;
  for (const ext of ["jpg", "jpeg", "png", "webp", "gif"]) {
    try {
      await deleteObject(ref(storage, `${pathPrefix}.${ext}`));
    } catch {
      /* object may not exist */
    }
  }
}
