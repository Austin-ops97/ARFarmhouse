/**
 * Shared proportional resize helpers for decode pipelines (`createImageBitmap`, canvas export).
 */

/** Shrinks width and height by the same factor so aspect ratio stays identical (within integer rounding). */
export function shrinkResizeTargetUniform(
  width: number,
  height: number,
  factor: number,
  floorMin: number
): { width: number; height: number } {
  const w = Math.max(floorMin, Math.floor(width * factor));
  const h = Math.max(floorMin, Math.floor(height * factor));
  return { width: Math.max(1, w), height: Math.max(1, h) };
}
