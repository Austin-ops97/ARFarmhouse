import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { timestampToDate } from "@/lib/booking-dates";
import type { BookingActivityEntry, BookingActivityEntryClient } from "@/lib/booking-activity";
import { actionDebug } from "@/lib/action-debug";
import { tryGetFirestoreDb } from "@/lib/firebase";
import {
  BLACKOUT_DATES_COLLECTION,
  BOOKINGS_COLLECTION,
  type BlackoutDate,
  type Booking,
  type BookingPolicyAcknowledgment,
  type BookingStatus,
  type BookingType,
  type FirestoreBlackoutDate,
  type FirestoreBooking,
  type FirestoreBookingPolicyAcknowledgment,
} from "@/models/booking";

function mapPolicyAcknowledgment(
  raw: FirestoreBooking["policyAcknowledgment"]
): BookingPolicyAcknowledgment | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<FirestoreBookingPolicyAcknowledgment>;
  const acknowledgmentTimestamp = timestampToDate(row.acknowledgmentTimestamp);
  if (!acknowledgmentTimestamp || typeof row.acknowledgmentVersion !== "number") {
    return null;
  }
  return {
    generalAcknowledged: row.generalAcknowledged === true,
    firearmsAcknowledged: row.firearmsAcknowledged === true,
    acknowledgmentTimestamp,
    acknowledgmentVersion: row.acknowledgmentVersion,
  };
}

function mapActivityLog(raw: unknown): BookingActivityEntryClient[] {
  if (!Array.isArray(raw)) return [];
  const entries: BookingActivityEntryClient[] = [];
  for (const row of raw) {
    const e = row as Partial<BookingActivityEntry>;
    const ts = timestampToDate(e.timestamp);
    if (!ts || typeof e.action !== "string") continue;
    entries.push({
      action: e.action as BookingActivityEntryClient["action"],
      byUser: (e.byUser as string) ?? "",
      byUserName: (e.byUserName as string) ?? "Member",
      timestamp: ts,
      ...(typeof e.details === "string" ? { details: e.details } : {}),
    });
  }
  return entries;
}

export function mapBookingDoc(snap: QueryDocumentSnapshot<DocumentData>): Booking {
  const data = snap.data() as Partial<FirestoreBooking>;
  const status: BookingStatus =
    data.status === "approved" ||
    data.status === "denied" ||
    data.status === "cancelled" ||
    data.status === "pending_conflict" ||
    data.status === "pending"
      ? data.status
      : "pending";
  const type: BookingType = data.type === "event" ? "event" : "booking";

  return {
    id: snap.id,
    title: (data.title as string) ?? "",
    description: (data.description as string) ?? "",
    type,
    startDate: timestampToDate(data.startDate) ?? new Date(0),
    endDate: timestampToDate(data.endDate) ?? new Date(0),
    status,
    createdBy: (data.createdBy as string) ?? "",
    createdByName: (data.createdByName as string) ?? "Member",
    approvedBy: typeof data.approvedBy === "string" ? data.approvedBy : null,
    approvedAt: timestampToDate(data.approvedAt),
    deniedReason: typeof data.deniedReason === "string" ? data.deniedReason : null,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    calendarEventId: typeof data.calendarEventId === "string" ? data.calendarEventId : null,
    legacyBookingRequestId:
      typeof data.legacyBookingRequestId === "string" ? data.legacyBookingRequestId : null,
    conflictsWith: Array.isArray(data.conflictsWith)
      ? (data.conflictsWith as string[]).filter((id) => typeof id === "string")
      : [],
    activityLog: mapActivityLog(data.activityLog),
    deleted: data.deleted === true,
    deletedAt: timestampToDate(data.deletedAt),
    deletedBy: typeof data.deletedBy === "string" ? data.deletedBy : null,
    deletedReason: typeof data.deletedReason === "string" ? data.deletedReason : null,
    policyAcknowledgment: mapPolicyAcknowledgment(data.policyAcknowledgment),
  };
}

export async function fetchBookingById(bookingId: string): Promise<Booking | null> {
  const db = tryGetFirestoreDb();
  if (!db) return null;
  const { getDoc, doc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, BOOKINGS_COLLECTION, bookingId));
  if (!snap.exists()) return null;
  return mapBookingDoc(snap);
}

export async function fetchUserBookings(userId: string): Promise<Booking[]> {
  const db = tryGetFirestoreDb();
  if (!db) return [];
  const { getDocs, query, where, collection: col } = await import("firebase/firestore");
  const snap = await getDocs(
    query(col(db, BOOKINGS_COLLECTION), where("createdBy", "==", userId))
  );
  return snap.docs.map(mapBookingDoc).filter((b) => !b.deleted);
}

/** Bookings awaiting admin review (pending + conflict-flagged). */
export function subscribePendingBookings(
  onBookings: (rows: Booking[]) => void,
  onError?: (e: Error) => void
): () => void {
  const db = tryGetFirestoreDb();
  if (!db) {
    onBookings([]);
    return () => {};
  }

  const pendingQuery = query(
    collection(db, BOOKINGS_COLLECTION),
    where("status", "in", ["pending", "pending_conflict"])
  );

  return onSnapshot(
    pendingQuery,
    (snap) => {
      const rows = snap.docs
        .map(mapBookingDoc)
        .filter((b) => !b.deleted)
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      onBookings(rows);
    },
    (err) => {
      actionDebug("booking", "pending subscribe error", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

/**
 * Bookings overlapping a visible month range:
 * `endDate >= monthStart` AND `startDate <= monthEnd`.
 *
 * Requires composite index `bookings` (endDate ASC, startDate ASC) in
 * `firestore.indexes.json` — deploy with `npm run firebase:deploy:indexes`.
 */
export function subscribeBookingsForMonth(
  year: number,
  monthIndex: number,
  onBookings: (rows: Booking[]) => void,
  onError?: (e: Error) => void
): () => void {
  const db = tryGetFirestoreDb();
  if (!db) {
    onBookings([]);
    return () => {};
  }

  const monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  const monthQuery = query(
    collection(db, BOOKINGS_COLLECTION),
    where("startDate", "<=", monthEnd),
    where("endDate", ">=", monthStart)
  );

  return onSnapshot(
    monthQuery,
    (snap) => {
      const rows = snap.docs
        .map(mapBookingDoc)
        .filter((b) => !b.deleted)
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      onBookings(rows);
    },
    (err) => {
      actionDebug("booking", "bookings subscribe error", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

function mapBlackoutDoc(snap: QueryDocumentSnapshot<DocumentData>): BlackoutDate {
  const data = snap.data() as Partial<FirestoreBlackoutDate>;
  return {
    id: snap.id,
    title: (data.title as string) ?? "",
    reason: (data.reason as string) ?? "",
    startDate: timestampToDate(data.startDate) ?? new Date(0),
    endDate: timestampToDate(data.endDate) ?? new Date(0),
    createdBy: (data.createdBy as string) ?? "",
    createdAt: timestampToDate(data.createdAt),
  };
}

/** Read-only subscription for blackout dates (admin UI arrives in a later phase). */
export function subscribeBlackoutDates(
  onRows: (rows: BlackoutDate[]) => void,
  onError?: (e: Error) => void
): () => void {
  const db = tryGetFirestoreDb();
  if (!db) {
    onRows([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, BLACKOUT_DATES_COLLECTION),
    (snap) => {
      const rows = snap.docs.map(mapBlackoutDoc).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      onRows(rows);
    },
    (err) => {
      actionDebug("booking", "blackout subscribe error", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}
