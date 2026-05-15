import { deleteObject, getDownloadURL, ref, uploadBytes, uploadBytesResumable } from "firebase/storage";

import { actionDebug } from "@/lib/action-debug";
import { AVATAR_UPLOAD_MAX_BYTES } from "@/lib/image-avatar-process";
import { isFirebaseStorageAvailable, tryGetFirebaseStorage } from "@/lib/firebase";

const STORAGE_UNAVAILABLE_MESSAGE =
  "Photo uploads are not available yet. Firebase Storage may still be setting up — you can save other profile details in the meantime.";

export function isProfilePhotoUploadAvailable(): boolean {
  return isFirebaseStorageAvailable();
}

/** Optimized avatar uploads after client crop/compress. */
const AVATAR_MAX_BYTES = AVATAR_UPLOAD_MAX_BYTES;

/** Legacy direct uploads (family/pet) until those flows use the cropper. */
const LEGACY_PHOTO_MAX_BYTES = 6 * 1024 * 1024;

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "img";
}

function validateImage(file: File, maxBytes: number) {
  if (!file.type.startsWith("image/")) {
    throw new Error(`"${file.name}" is not a supported image.`);
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`"${file.name}" is too large. Keep photos under ${mb} MB.`);
  }
  if (file.size === 0) {
    throw new Error(`"${file.name}" appears to be empty.`);
  }
}

async function uploadPath(
  path: string,
  file: File,
  maxBytes: number,
  onProgress?: (percent: number) => void
): Promise<string> {
  const storage = tryGetFirebaseStorage();
  if (!storage) throw new Error(STORAGE_UNAVAILABLE_MESSAGE);
  validateImage(file, maxBytes);
  const ext = extFromMime(file.type || "image/jpeg");
  const objectRef = ref(storage, `${path}.${ext}`);
  try {
    if (onProgress) {
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(objectRef, file, { contentType: file.type || "image/jpeg" });
        task.on(
          "state_changed",
          (snap) => {
            if (snap.totalBytes > 0) {
              onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
            }
          },
          (err) => reject(err),
          () => resolve()
        );
      });
    } else {
      await uploadBytes(objectRef, file, { contentType: file.type || "image/jpeg" });
    }
    const url = await getDownloadURL(objectRef);
    actionDebug("profile-upload", "complete", { path });
    return url;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    actionDebug("profile-upload", "failed", { path, msg });
    if (msg.includes("storage/unauthorized") || msg.includes("permission") || msg.includes("403")) {
      throw new Error("Photo upload was denied. Sign in again and check Storage rules in Firebase Console.");
    }
    if (msg.includes("storage/unknown") || msg.includes("storage/object-not-found")) {
      throw new Error(STORAGE_UNAVAILABLE_MESSAGE);
    }
    throw new Error("Could not upload that photo. Try again in a moment.");
  }
}

export async function uploadProfilePhoto(
  uid: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  return uploadPath(`users/${uid}/profile/avatar`, file, AVATAR_MAX_BYTES, onProgress);
}

export async function uploadFamilyMemberPhoto(uid: string, memberId: string, file: File): Promise<string> {
  return uploadPath(`users/${uid}/family/${memberId}/photo`, file, LEGACY_PHOTO_MAX_BYTES);
}

export async function uploadPetPhoto(uid: string, petId: string, file: File): Promise<string> {
  return uploadPath(`users/${uid}/pets/${petId}/photo`, file, LEGACY_PHOTO_MAX_BYTES);
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
