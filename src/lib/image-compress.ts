/** @deprecated Use `processImageFile` from `@/lib/image-process` with an explicit preset. */
import { processImageFile } from "@/lib/image-process";

/** Client-side resize before upload — feed-style defaults. */
export async function compressImageFile(
  file: File,
  maxEdge = 1800,
  quality = 0.82
): Promise<File> {
  if (maxEdge === 1800 && quality === 0.82) {
    return (await processImageFile(file, "feed")).file;
  }
  const processed = await processImageFile(file, "feed");
  return processed.file;
}
