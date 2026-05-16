/**
 * Media domain — upload pipeline, compression, storage.
 */

export {
  validateImageUpload,
  validateImageBatch,
  UPLOAD_LIMITS,
} from "@/platform/security/upload-validation";
export { enqueueCpuBoundMediaTask } from "@/lib/media-upload-queue";
export {
  uploadPostImages,
  uploadAlbumImages,
  deleteStoragePath,
} from "@/services/storage-upload";
export type { MediaProcessingStatus } from "@/models/media-processing";
export { enqueueMediaUploadTask } from "@/lib/media-upload-queue";
