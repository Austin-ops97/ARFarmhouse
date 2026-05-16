import {
  type ImageUploadPreset,
  type ProcessedImageFile,
  processImageFiles,
  type ProcessImagesProgress,
} from "@/lib/image-process";
import { isLargeRawImage, validateRawImageFile } from "@/lib/image-input";
import {
  buildPassthroughProcessedArtifacts,
  safariRawDiagnosticLog,
  shouldBypassBrowserTransformsForSafariRawDiagnostic,
} from "@/lib/safari-raw-diagnostic";
import { uploadLog, uploadStage } from "@/lib/upload-log";

/**
 * Central client-side media pipeline: validate → prepare → GPU-friendly decode/resize → encode → upload.
 * All Firebase writes should consume only `ProcessedImageFile.file` (never raw camera originals for lossy types).
 */
export type ImagePipelinePhase = "validating" | "preparing" | "optimizing" | "ready";

export type ImagePipelineProgress = {
  phase: ImagePipelinePhase;
  done: number;
  total: number;
  message: string;
};

export type PrepareImagesOptions = {
  onProgress?: (progress: ImagePipelineProgress) => void;
  signal?: AbortSignal;
};

export type { ProcessedImageFile };

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Upload cancelled.", "AbortError");
  }
}

function optimizingMessage(files: File[], done: number, total: number): string {
  const hasLarge = files.some(isLargeRawImage);
  if (total > 1) {
    if (hasLarge) {
      return `Preparing large photo ${Math.min(done + 1, total)} of ${total}…`;
    }
    return `Preparing photo ${Math.min(done + 1, total)} of ${total}…`;
  }
  return hasLarge ? "Preparing large photo…" : "Preparing photo…";
}

/** Full optimization result + metadata for Firestore (Firebase stores URLs only — meta is supplementary). */
export async function prepareOptimizedArtifactsForFirebase(
  files: File[],
  preset: ImageUploadPreset,
  options?: PrepareImagesOptions
): Promise<ProcessedImageFile[]> {
  const { onProgress, signal } = options ?? {};
  const total = files.length;

  if (shouldBypassBrowserTransformsForSafariRawDiagnostic()) {
    uploadStage("pipeline: safari-raw diagnostic bypass", { total, preset });
    onProgress?.({ phase: "validating", done: 0, total, message: "Checking photos…" });
    for (let i = 0; i < files.length; i++) {
      assertNotAborted(signal);
      validateRawImageFile(files[i]!);
      onProgress?.({
        phase: "validating",
        done: i + 1,
        total,
        message: total > 1 ? `Checking ${i + 1} of ${total}…` : "Checking photo…",
      });
    }
    assertNotAborted(signal);
    onProgress?.({
      phase: "optimizing",
      done: 0,
      total,
      message: "Uploading original photo…",
    });
    const artifacts = await buildPassthroughProcessedArtifacts(files, preset);
    onProgress?.({
      phase: "ready",
      done: total,
      total,
      message: total > 1 ? `${total} photos ready` : "Ready to upload",
    });
    safariRawDiagnosticLog("passthrough artifacts ready for Storage", {
      preset,
      fileCount: artifacts.length,
      totalBytes: artifacts.reduce((n, a) => n + a.file.size, 0),
    });
    return artifacts;
  }

  uploadStage("pipeline: batch received", { total, preset });
  uploadStage("file validation start", { total, preset });
  uploadLog("validating", { total, preset });
  onProgress?.({ phase: "validating", done: 0, total, message: "Checking photos…" });

  for (let i = 0; i < files.length; i++) {
    assertNotAborted(signal);
    validateRawImageFile(files[i]!);
    onProgress?.({
      phase: "validating",
      done: i + 1,
      total,
      message: total > 1 ? `Checking ${i + 1} of ${total}…` : "Checking photo…",
    });
  }

  assertNotAborted(signal);
  uploadLog("preparing", { total, preset });
  onProgress?.({
    phase: "preparing",
    done: 0,
    total,
    message: total > 1 ? "Preparing photos…" : "Preparing photo…",
  });

  assertNotAborted(signal);
  uploadStage("normalization phase start", { total, preset });
  uploadLog("normalizing", { total, preset });
  onProgress?.({
    phase: "optimizing",
    done: 0,
    total,
    message: optimizingMessage(files, 0, total),
  });

  const artifacts = await processImageFiles(files, preset, (p: ProcessImagesProgress) => {
    assertNotAborted(signal);
    onProgress?.({
      phase: "optimizing",
      done: p.done,
      total: p.total,
      message: optimizingMessage(files, p.done, p.total),
    });
  });

  uploadStage("all artifacts normalized", {
    preset,
    fileCount: artifacts.length,
    totalBytes: artifacts.reduce((n, a) => n + a.optimizedSizeBytes, 0),
  });
  uploadLog("normalized", {
    total,
    preset,
    bytes: artifacts.reduce((n, a) => n + a.optimizedSizeBytes, 0),
  });
  onProgress?.({
    phase: "ready",
    done: total,
    total,
    message: total > 1 ? `${total} photos ready` : "Ready to upload",
  });

  return artifacts;
}

/**
 * Validates raw camera roll picks, runs the shared optimizer, returns only uploaded `File` blobs (WebP/JPEG).
 */
export async function prepareImagesForUpload(
  files: File[],
  preset: ImageUploadPreset,
  options?: PrepareImagesOptions
): Promise<File[]> {
  const artifacts = await prepareOptimizedArtifactsForFirebase(files, preset, options);
  return artifacts.map((a) => a.file);
}
