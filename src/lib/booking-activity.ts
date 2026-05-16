import type { Timestamp } from "firebase/firestore";

import { nowTimestamp } from "@/lib/datetime/time";

export type BookingActivityAction =
  | "created"
  | "edited"
  | "approved"
  | "denied"
  | "cancelled"
  | "deleted"
  | "restored"
  | "conflict_flagged";

export type BookingActivityEntry = {
  action: BookingActivityAction;
  byUser: string;
  byUserName: string;
  /** Concrete Timestamp — Firestore rejects serverTimestamp() inside arrays. */
  timestamp: Timestamp;
  details?: string;
};

export type BookingActivityEntryClient = {
  action: BookingActivityAction;
  byUser: string;
  byUserName: string;
  timestamp: Date;
  details?: string;
};

export function activityLabel(action: BookingActivityAction): string {
  switch (action) {
    case "created":
      return "Submitted";
    case "edited":
      return "Updated";
    case "approved":
      return "Approved";
    case "denied":
      return "Denied";
    case "cancelled":
      return "Cancelled";
    case "deleted":
      return "Removed";
    case "restored":
      return "Restored";
    case "conflict_flagged":
      return "Conflict flagged";
    default:
      return action;
  }
}

export function buildActivityEntry(
  action: BookingActivityAction,
  byUser: string,
  byUserName: string,
  details?: string
): BookingActivityEntry {
  return {
    action,
    byUser,
    byUserName,
    timestamp: nowTimestamp(),
    ...(details?.trim() ? { details: details.trim() } : {}),
  };
}

export function appendActivity(
  existing: BookingActivityEntry[] | undefined,
  entry: BookingActivityEntry
): BookingActivityEntry[] {
  const prior = Array.isArray(existing) ? existing : [];
  return [...prior, entry].slice(-50);
}
