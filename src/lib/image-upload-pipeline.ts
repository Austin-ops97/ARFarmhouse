import {
  type ImageUploadPreset,
  processImageFiles,
  type ProcessImagesProgress,
} from "@/lib/image-process";
import { validateRawImageFile } from "@/lib/image-input";

export type ImagePipelinePhase = "validating" | "processing" | "ready";

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
    phase: "processing",
    done: 0,
    total,
    message: total > 1 ? "Optimizing photos…" : "Optimizing photo…",
  });

  return processImageFiles(files, preset, (p: ProcessImagesProgress) => {
    assertNotAborted(signal);
    onProgress?.({
      phase: "processing",
      done: p.done,
      total: p.total,
      message:
        p.total > 1
          ? `Optimizing ${Math.min(p.done + 1, p.total)} of ${p.total}…`
          : "Optimizing photo…",
    });
  });
}
