/**
 * TEMPORARY diagnostic: bypass browser-side image transforms on iOS WebKit production
 * deploys and upload the original `File` to Firebase Storage.
 *
 * Remove once mobile Safari production root cause is confirmed.
 */

import { probeImageDimensions } from "@/lib/image-dimensions";
import { validateRawImageFile } from "@/lib/image-input";
import type { ImageUploadPreset, ProcessedImageFile } from "@/lib/image-process";
import { shouldUseSimpleIOSWebKitUpload } from "@/lib/ios-webkit-upload-transport";

/** Always logs — production Safari sessions need this without localStorage. */
export function safariRawDiagnosticLog(message: string, detail?: Record<string, unknown>): void {
  if (detail !== undefined) {
    console.info(`[safari-raw] ${message}`, detail);
  } else {
    console.info(`[safari-raw] ${message}`);
  }
}

/** Non-localhost client bundle (Vercel production / preview, custom domain). */
export function isDeployedProductionClient(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) return false;
  return process.env.NODE_ENV === "production";
}

/**
 * TEMPORARY: iPhone / iPad / iOS WebKit on a deployed production build only.
 * Desktop and localhost keep the normal optimization pipeline.
 */
export function shouldBypassBrowserTransformsForSafariRawDiagnostic(): boolean {
  if (!shouldUseSimpleIOSWebKitUpload()) return false;
  return isDeployedProductionClient();
}

/** Build {@link ProcessedImageFile} rows that pass the original picker `File` through unchanged. */
export async function buildPassthroughProcessedArtifacts(
  files: File[],
  preset: ImageUploadPreset
): Promise<ProcessedImageFile[]> {
  safariRawDiagnosticLog("bypassing browser transforms", {
    preset,
    fileCount: files.length,
    files: files.map((f) => ({
      name: f.name,
      size: f.size,
      mime: f.type || "unknown",
    })),
  });

  const artifacts: ProcessedImageFile[] = [];
  for (const file of files) {
    validateRawImageFile(file);
    const dims = await probeImageDimensions(file);
    const width = dims?.width && dims.width > 0 ? dims.width : 1;
    const height = dims?.height && dims.height > 0 ? dims.height : 1;
    artifacts.push({
      file,
      width,
      height,
      originalSize: file.size,
      originalMime: file.type || "image/jpeg",
      normalizedSizeBytes: file.size,
      optimizedSizeBytes: file.size,
      skippedNormalization: true,
      skippedOptimization: true,
    });
  }
  return artifacts;
}
