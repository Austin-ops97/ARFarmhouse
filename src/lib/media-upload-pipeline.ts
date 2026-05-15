/** Central media pipeline — validates, optimizes, and produces Firebase-ready blobs + metadata. */
export {
  prepareImagesForUpload,
  prepareOptimizedArtifactsForFirebase,
  type ImagePipelinePhase,
  type ImagePipelineProgress,
  type PrepareImagesOptions,
  type ProcessedImageFile,
} from "@/lib/image-upload-pipeline";
