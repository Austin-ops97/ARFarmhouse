import { deleteObject, ref } from "firebase/storage";

import { actionDebug } from "@/lib/action-debug";
import { AVATAR_UPLOAD_MAX_BYTES } from "@/lib/image-avatar-process";
import { getUploadMaxBytes } from "@/lib/image-process";
import { isFirebaseStorageAvailable, tryGetFirebaseStorage } from "@/lib/firebase";
import { uploadLog, uploadStage } from "@/lib/upload-log";
import { readPublicFirebaseConfig } from "@/lib/firebase/env";
import { uploadStorageImageResumable, waitForStorageDownloadURL } from "@/services/storage-upload";

const STORAGE_UNAVAILABLE_MESSAGE =
  "Photo uploads are not available yet. Firebase Storage may still be setting up — you can save other profile details in the meantime.";

export function isProfilePhotoUploadAvailable(): boolean {
  return isFirebaseStorageAvailable();
}

/** Optimized avatar uploads after client crop/compress. */
const AVATAR_MAX_BYTES = AVATAR_UPLOAD_MAX_BYTES;
const FAMILY_PET_MAX_BYTES = getUploadMaxBytes("family");

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime.startsWith("image/")) return "jpg";
  return "jpg";
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
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const storage = tryGetFirebaseStorage();
  if (!storage) throw new Error(STORAGE_UNAVAILABLE_MESSAGE);
  validateImage(file, maxBytes);
  const ext = extFromMime(file.type || "image/jpeg");
  const fullPath = `${path}.${ext}`;
  const cfg = readPublicFirebaseConfig();
  const storageBucket = cfg?.storageBucket ?? "(firebase storage bucket not configured)";
  uploadStage("storage upload path resolved", {
    domain: "profile_family_or_pet",
    storageBucket,
    fullPath,
    template: `${path}.{jpg|jpeg|png|webp|gif}`,
  });
  uploadLog("profile_upload_start", { path: fullPath });
  const objectRef = ref(storage, fullPath);
  try {
    await uploadStorageImageResumable(objectRef, file, {
      signal,
      label: fullPath,
      onProgress,
    });
    const url = await waitForStorageDownloadURL(objectRef, fullPath);
    actionDebug("profile-upload", "complete", { path: fullPath });
    uploadLog("profile_upload_complete", { path: fullPath });
    return url;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    actionDebug("profile-upload", "failed", { path: fullPath, msg });
    uploadLog("profile_upload_failed", { path: fullPath, msg });
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
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<string> {
  return uploadPath(`users/${uid}/profile/avatar`, file, AVATAR_MAX_BYTES, onProgress, signal);
}

export async function uploadFamilyMemberPhoto(
  uid: string,
  memberId: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<string> {
  return uploadPath(`users/${uid}/family/${memberId}/photo`, file, FAMILY_PET_MAX_BYTES, onProgress, signal);
}

export async function uploadPetPhoto(
  uid: string,
  petId: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<string> {
  return uploadPath(`users/${uid}/pets/${petId}/photo`, file, FAMILY_PET_MAX_BYTES, onProgress, signal);
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
