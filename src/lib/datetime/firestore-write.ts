/**
 * Guards against invalid Firestore client writes (e.g. serverTimestamp inside arrays).
 */

import { Timestamp } from "firebase/firestore";

export type FirestoreWriteIssue =
  | { kind: "server_timestamp_in_array"; path: string }
  | { kind: "undefined_value"; path: string };

function isFirestoreFieldValue(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "_methodName" in value &&
    typeof (value as { _methodName: unknown })._methodName === "string"
  );
}

function isServerTimestampSentinel(value: unknown): boolean {
  return (
    isFirestoreFieldValue(value) &&
    (value as { _methodName: string })._methodName === "serverTimestamp"
  );
}

export function findFirestoreWriteIssues(
  value: unknown,
  path = "root",
  insideArray = false
): FirestoreWriteIssue[] {
  const issues: FirestoreWriteIssue[] = [];

  if (value === undefined) {
    if (path !== "root") issues.push({ kind: "undefined_value", path });
    return issues;
  }

  if (value instanceof Date || value instanceof Timestamp) {
    return issues;
  }

  if (isServerTimestampSentinel(value)) {
    if (insideArray) issues.push({ kind: "server_timestamp_in_array", path });
    return issues;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      issues.push(...findFirestoreWriteIssues(item, `${path}[${index}]`, true));
    });
    return issues;
  }

  if (value && typeof value === "object" && !isFirestoreFieldValue(value)) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      issues.push(...findFirestoreWriteIssues(child, `${path}.${key}`, insideArray));
    }
  }

  return issues;
}

export function assertFirestoreWriteSafe(value: unknown, label = "document"): void {
  const issues = findFirestoreWriteIssues(value);
  if (issues.length === 0) return;

  const detail = issues
    .map((i) =>
      i.kind === "server_timestamp_in_array"
        ? `serverTimestamp() at ${i.path}`
        : `undefined at ${i.path}`
    )
    .join("; ");

  throw new Error(`Invalid Firestore write for ${label}: ${detail}`);
}

/** Remove undefined keys so Firestore accepts nested maps (shallow per object). */
export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }
  if (
    value &&
    typeof value === "object" &&
    !isFirestoreFieldValue(value) &&
    !(value instanceof Date) &&
    !(value instanceof Timestamp)
  ) {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (child !== undefined) out[key] = stripUndefinedDeep(child);
    }
    return out as T;
  }
  return value;
}
