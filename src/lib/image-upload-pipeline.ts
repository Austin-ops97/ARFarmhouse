import {
  type ImageUploadPreset,
  processImageFiles,
  type ProcessImagesProgress,
} from "@/lib/image-process";
import { isLargeRawImage, validateRawImageFile } from "@/lib/image-input";

export type ImagePipelinePhase = "validating" | "optimizing" | "ready";

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

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Upload cancelled.", "AbortError");
  }
}

function optimizingMessage(files: File[], done: number, total: number): string {
  const hasLarge = files.some(isLargeRawImage);
  if (total > 1) {
    if (hasLarge) {
      return `Optimizing large photo ${Math.min(done + 1, total)} of ${total}…`;
    }
    return `Optimizing ${Math.min(done + 1, total)} of ${total}…`;
  }
  return hasLarge ? "Optimizing large photo…" : "Optimizing…";
}

/**
 * Validates raw camera roll / phone photos, then optimizes each file for the given preset.
 */
export async function prepareImagesForUpload(
  files: File[],
  preset: ImageUploadPreset,
  options?: PrepareImagesOptions
): Promise<File[]> {
  const { onProgress, signal } = options ?? {};
  const total = files.length;

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

  onProgress?.({
    phase: "optimizing",
    done: 0,
    total,
    message: optimizingMessage(files, 0, total),
  });

  return processImageFiles(files, preset, (p: ProcessImagesProgress) => {
    assertNotAborted(signal);
    onProgress?.({
      phase: "optimizing",
      done: p.done,
      total: p.total,
      message: optimizingMessage(files, p.done, p.total),
    });
  });
}
