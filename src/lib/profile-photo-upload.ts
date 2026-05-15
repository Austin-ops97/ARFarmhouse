import { prepareImagesForUpload } from "@/lib/image-upload-pipeline";
import {
  uploadFamilyMemberPhoto,
  uploadPetPhoto,
} from "@/services/profile-storage";

export type ProfilePhotoUploadStatus = {
  message: string;
  uploadPercent?: number;
};

export async function uploadOptimizedFamilyMemberPhoto(
  uid: string,
  memberId: string,
  rawFile: File,
  onStatus?: (status: ProfilePhotoUploadStatus) => void
): Promise<string> {
  onStatus?.({ message: "Optimizing photo…" });
  const [optimized] = await prepareImagesForUpload([rawFile], "family");
  onStatus?.({ message: "Uploading…", uploadPercent: 0 });
  return uploadFamilyMemberPhoto(uid, memberId, optimized, (pct) =>
    onStatus?.({ message: "Uploading…", uploadPercent: pct })
  );
}

export async function uploadOptimizedPetPhoto(
  uid: string,
  petId: string,
  rawFile: File,
  onStatus?: (status: ProfilePhotoUploadStatus) => void
): Promise<string> {
  onStatus?.({ message: "Optimizing photo…" });
  const [optimized] = await prepareImagesForUpload([rawFile], "pet");
  onStatus?.({ message: "Uploading…", uploadPercent: 0 });
  return uploadPetPhoto(uid, petId, optimized, (pct) =>
    onStatus?.({ message: "Uploading…", uploadPercent: pct })
  );
}
