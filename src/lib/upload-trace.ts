import { uploadLog } from "@/lib/upload-log";

/** Correlation + elapsed ms since trace start (`performance.now`). */
export type UploadTrace = (event: string, detail?: Record<string, unknown>) => void;

/** High-level pipeline bucket for log filtering / support triage. */
export type UploadTraceSegment = "validate" | "cpu" | "storage" | "firestore" | "meta";

/** Start a hierarchical upload trace (`runId` groups all stages per publish job). */
export function startUploadTrace(runId: string, label: string): UploadTrace {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();

  const elapsed = (): number =>
    Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0);

  return (event, detail = {}) =>
    uploadLog(`${label} — ${event}`, {
      runId,
      job: label,
      elapsedMs: elapsed(),
      ...detail,
    });
}

/** Wrap a trace to tag every line with a segment (CPU vs Storage vs Firestore). */
export function withUploadTraceSegment(trace: UploadTrace | undefined, segment: UploadTraceSegment): UploadTrace | undefined {
  if (!trace) return undefined;
  return (event, detail = {}) => trace(event, { segment, ...detail });
}
