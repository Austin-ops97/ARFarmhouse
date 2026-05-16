import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  deleteDoc,
  type DocumentReference,
} from "firebase/firestore";

import { buildActivityEntry } from "@/lib/booking-activity";
import { calendarDayRangeToTimestamps, formatBookingDateRange, timestampToDate } from "@/lib/booking-dates";
import { assertFirestoreWriteSafe } from "@/lib/datetime/firestore-write";
import {
  BLACKOUT_BLOCK_MESSAGE,
  resolveBookingCreateConflict,
} from "@/lib/booking-conflict-engine";
import { validateBookingLimits } from "@/lib/booking-limits";
import { bookingStatusToCalendarStatus } from "@/lib/booking-migration";
import { bookingEventTitle, TRIP_CALENDAR_META } from "@/lib/booking-calendar";
import { BOOKING_CONFLICT_MESSAGE } from "@/lib/booking-conflicts";
import {
  notifyBookingApproved,
  notifyBookingCancelled,
  notifyBookingDenied,
  notifyBookingSubmitted,
} from "@/lib/notification-fanout-bookings";
import { guardedMutation, mutationKey } from "@/lib/request-guard";
import { actionDebug } from "@/lib/action-debug";
import { tryGetFirestoreDb } from "@/lib/firebase";
import type { BookingLimitsConfig } from "@/models/system-settings";
import { DEFAULT_BOOKING_LIMITS } from "@/models/system-settings";
import {
  BLACKOUT_DATES_COLLECTION,
  BOOKINGS_COLLECTION,
  type BlackoutDate,
  type Booking,
  type BookingStatus,
  type BookingType,
  type FirestoreBlackoutDate,
} from "@/models/booking";
import { fetchUserBookings, mapBookingDoc } from "@/services/bookings";
import { fetchSystemSettings } from "@/services/system-settings";

export type CreateBookingInput = {
  type: BookingType;
  title: string;
  description: string;
  year: number;
  monthIndex: number;
  startDay: number;
  endDay: number;
  createdBy: string;
  createdByName: string;
  actorAvatarUrl?: string | null;
  tripId?: string;
  guests?: number;
  roomId?: string;
  notes?: string;
  tripPurpose?: string;
  attendeeLabels?: string[];
  attendeeMemberIds?: string[];
  attendeePetIds?: string[];
  includeSelf?: boolean;
};

export type CreateBookingResult = {
  bookingId: string;
  calendarEventId: string;
  bookingRequestId: string;
  status: BookingStatus;
  conflictsWith: string[];
};

export type BookingMutationActor = {
  uid: string;
  displayName: string;
  avatarUrl?: string | null;
};

function requireDocumentRef(ref: unknown, label: string): asserts ref is DocumentReference {
  if (
    !ref ||
    typeof ref !== "object" ||
    !("path" in ref) ||
    typeof (ref as { path: unknown }).path !== "string" ||
    !(ref as { path: string }).path.length
  ) {
    throw new Error(`Invalid Firestore reference for ${label}.`);
  }
}

function mapBlackoutRow(id: string, data: Partial<FirestoreBlackoutDate>): BlackoutDate {
  return {
    id,
    title: (data.title as string) ?? "",
    reason: (data.reason as string) ?? "",
    startDate: timestampToDate(data.startDate) ?? new Date(0),
    endDate: timestampToDate(data.endDate) ?? new Date(0),
    createdBy: (data.createdBy as string) ?? "",
    createdAt: timestampToDate(data.createdAt),
  };
}

async function fetchBlackoutsForRange(start: Date, end: Date): Promise<BlackoutDate[]> {
  const db = tryGetFirestoreDb();
  if (!db) return [];

  const snap = await getDocs(collection(db, BLACKOUT_DATES_COLLECTION));
  return snap.docs
    .map((d) => mapBlackoutRow(d.id, d.data() as Partial<FirestoreBlackoutDate>))
    .filter((b) => b.startDate <= end && b.endDate >= start);
}

/** Same overlap predicate as `subscribeBookingsForMonth` — shares the bookings date-range index. */
async function fetchBookingsOverlappingRange(start: Date, end: Date): Promise<Booking[]> {
  const db = tryGetFirestoreDb();
  if (!db) return [];

  const { startDate: startTs } = calendarDayRangeToTimestamps(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    start.getDate()
  );
  const { endDate: endTs } = calendarDayRangeToTimestamps(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
    end.getDate()
  );

  const snap = await getDocs(
    query(
      collection(db, BOOKINGS_COLLECTION),
      where("startDate", "<=", endTs),
      where("endDate", ">=", startTs)
    )
  );

  return snap.docs.map(mapBookingDoc).filter((b) => !b.deleted);
}

async function resolveLimits(): Promise<BookingLimitsConfig> {
  try {
    const settings = await fetchSystemSettings();
    return settings.bookingLimits;
  } catch {
    return DEFAULT_BOOKING_LIMITS;
  }
}

async function loadBooking(bookingId: string): Promise<Booking> {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const snap = await getDoc(doc(db, BOOKINGS_COLLECTION, bookingId));
  if (!snap.exists()) throw new Error("Booking not found.");
  return mapBookingDoc(snap);
}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  return guardedMutation(
    mutationKey("booking", "create", `${input.createdBy}_${input.year}_${input.monthIndex}_${input.startDay}`),
    () => createBookingInner(input),
    { dedupe: true }
  );
}

async function createBookingInner(input: CreateBookingInput): Promise<CreateBookingResult> {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");

  const startDay = Math.min(input.startDay, input.endDay);
  const endDay = Math.max(input.startDay, input.endDay);
  if (startDay < 1 || endDay < startDay) {
    throw new Error("Pick a valid date range on the calendar.");
  }

  const { startDate, endDate } = calendarDayRangeToTimestamps(
    input.year,
    input.monthIndex,
    startDay,
    endDay
  );
  const start = startDate.toDate();
  const end = endDate.toDate();

  const [limits, userBookings, blackouts, overlappingBookings] = await Promise.all([
    resolveLimits(),
    fetchUserBookings(input.createdBy),
    fetchBlackoutsForRange(start, end),
    fetchBookingsOverlappingRange(start, end),
  ]);

  const limitViolation = validateBookingLimits({
    limits,
    start,
    end,
    userId: input.createdBy,
    userBookings,
  });
  if (limitViolation) throw new Error(limitViolation.message);

  const conflict = resolveBookingCreateConflict(blackouts, overlappingBookings, start, end);
  if (conflict.blocked) {
    throw new Error(
      conflict.blackout.title
        ? `${BLACKOUT_BLOCK_MESSAGE} (${conflict.blackout.title})`
        : BLACKOUT_BLOCK_MESSAGE
    );
  }

  const title =
    input.title.trim() ||
    (input.type === "booking" && input.tripPurpose
      ? bookingEventTitle(input.tripPurpose, input.tripId ?? "family", input.guests ?? 0)
      : input.type === "event"
        ? "Special event"
        : "Stay");
  if (!title) throw new Error("Add a title for this booking.");

  const description = input.description.trim() || input.notes?.trim() || input.tripPurpose?.trim() || "";
  const status = conflict.status;
  const conflictsWith = conflict.conflictsWith;
  const dateLabel = formatBookingDateRange(start, end);

  const tripId = input.tripId ?? (input.type === "event" ? "event" : "family");
  const meta = TRIP_CALENDAR_META[tripId] ?? TRIP_CALENDAR_META.family;
  const guests = input.guests ?? 0;
  const timeLabel = guests ? `${guests} guest${guests === 1 ? "" : "s"}` : undefined;

  const bookingRef = doc(collection(db, BOOKINGS_COLLECTION));
  const eventRef = doc(collection(db, "calendarEvents"));
  const requestRef = doc(collection(db, "bookingRequests"));
  requireDocumentRef(bookingRef, BOOKINGS_COLLECTION);
  requireDocumentRef(eventRef, "calendarEvents");
  requireDocumentRef(requestRef, "bookingRequests");

  const calendarStatus = bookingStatusToCalendarStatus(status);
  const createdActivity = buildActivityEntry(
    status === "pending_conflict" ? "conflict_flagged" : "created",
    input.createdBy,
    input.createdByName,
    status === "pending_conflict" ? "Overlaps an approved stay" : undefined
  );

  try {
    const batch = writeBatch(db);
    batch.set(requestRef, {
      tripId,
      guests,
      roomId: input.roomId ?? "main",
      startDay,
      endDay,
      notes: input.notes ?? description,
      tripPurpose: input.tripPurpose ?? "",
      tripTitle: title,
      year: input.year,
      monthIndex: input.monthIndex,
      requestedBy: input.createdBy,
      requestedByName: input.createdByName,
      ownerUid: input.createdBy,
      includeSelf: input.includeSelf ?? true,
      attendeeMemberIds: input.attendeeMemberIds ?? [],
      attendeePetIds: input.attendeePetIds ?? [],
      attendeeLabels: input.attendeeLabels ?? [],
      status: "pending",
      calendarEventId: eventRef.id,
      bookingId: bookingRef.id,
      createdAt: serverTimestamp(),
    });
    batch.set(eventRef, {
      title,
      startDay,
      endDay,
      year: input.year,
      monthIndex: input.monthIndex,
      kind: input.type === "event" ? "holiday_gathering" : meta.kind,
      accent: input.type === "event" ? "violet" : meta.accent,
      timeLabel,
      status: calendarStatus,
      tripId,
      roomId: input.roomId ?? "main",
      guests,
      ownerUid: input.createdBy,
      includeSelf: input.includeSelf ?? true,
      attendeeMemberIds: input.attendeeMemberIds ?? [],
      attendeePetIds: input.attendeePetIds ?? [],
      attendeeLabels: input.attendeeLabels ?? [],
      notes: input.notes ?? description,
      tripPurpose: input.tripPurpose ?? "",
      tripTitle: title,
      requestedBy: input.createdBy,
      requestedByName: input.createdByName,
      bookingRequestId: requestRef.id,
      bookingId: bookingRef.id,
      recordType: input.type,
      unifiedStatus: status,
      conflictsWith,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const bookingPayload = {
      title,
      description,
      type: input.type,
      startDate,
      endDate,
      status,
      conflictsWith,
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      approvedBy: null,
      approvedAt: null,
      deniedReason: null,
      calendarEventId: eventRef.id,
      legacyBookingRequestId: requestRef.id,
      activityLog: [createdActivity],
      deleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    assertFirestoreWriteSafe(bookingPayload, "bookings create");
    batch.set(bookingRef, bookingPayload);
    await batch.commit();

    actionDebug("booking", "create complete", { bookingId: bookingRef.id, status });

    void notifyBookingSubmitted({
      actorId: input.createdBy,
      actorName: input.createdByName,
      actorAvatarUrl: input.actorAvatarUrl ?? null,
      bookingId: bookingRef.id,
      calendarEventId: eventRef.id,
      title,
      dateLabel,
      status: status === "pending_conflict" ? "pending_conflict" : "pending",
    }).catch(() => {});

    return {
      bookingId: bookingRef.id,
      calendarEventId: eventRef.id,
      bookingRequestId: requestRef.id,
      status,
      conflictsWith,
    };
  } catch (e) {
    actionDebug("booking", "create failed", e);
    if (e instanceof Error) {
      if (e.message.includes("overlap") || e.message.includes("blocked")) throw e;
      if (e.message.includes("failed-precondition") || e.message.includes("aborted")) {
        throw new Error(BOOKING_CONFLICT_MESSAGE);
      }
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Could not save the booking. ${msg}`);
  }
}

export async function approveBooking(
  bookingId: string,
  actor: BookingMutationActor
): Promise<void> {
  return guardedMutation(mutationKey("booking", "approve", bookingId), async () => {
    const db = tryGetFirestoreDb();
    if (!db) throw new Error("Firestore unavailable");

    const booking = await loadBooking(bookingId);
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const calendarEventId = booking.calendarEventId ?? undefined;
    const dateLabel = formatBookingDateRange(booking.startDate, booking.endDate);

    const approvePatch = {
      status: "approved" as const,
      approvedBy: actor.uid,
      approvedAt: serverTimestamp(),
      conflictsWith: [] as string[],
      updatedAt: serverTimestamp(),
      activityLog: arrayUnion(buildActivityEntry("approved", actor.uid, actor.displayName)),
    };
    assertFirestoreWriteSafe(
      { activityLog: [buildActivityEntry("approved", actor.uid, actor.displayName)] },
      "bookings approve activityLog"
    );
    const batch = writeBatch(db);
    batch.update(bookingRef, approvePatch);
    if (calendarEventId) {
      batch.update(doc(db, "calendarEvents", calendarEventId), {
        status: "confirmed",
        unifiedStatus: "approved",
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();

    void notifyBookingApproved({
      actorId: actor.uid,
      actorName: actor.displayName,
      actorAvatarUrl: actor.avatarUrl ?? null,
      bookingId,
      calendarEventId,
      creatorId: booking.createdBy,
      title: booking.title,
      dateLabel,
    }).catch(() => {});
  });
}

export async function denyBooking(
  bookingId: string,
  actor: BookingMutationActor,
  deniedReason: string
): Promise<void> {
  return guardedMutation(mutationKey("booking", "deny", bookingId), async () => {
    const db = tryGetFirestoreDb();
    if (!db) throw new Error("Firestore unavailable");

    const booking = await loadBooking(bookingId);
    const reason = deniedReason.trim() || "Declined by admin";
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const calendarEventId = booking.calendarEventId ?? undefined;

    const deniedEntry = buildActivityEntry("denied", actor.uid, actor.displayName, reason);
    assertFirestoreWriteSafe({ activityLog: [deniedEntry] }, "bookings deny activityLog");
    const batch = writeBatch(db);
    batch.update(bookingRef, {
      status: "denied",
      deniedReason: reason,
      approvedBy: actor.uid,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      activityLog: arrayUnion(deniedEntry),
    });
    if (calendarEventId) {
      batch.update(doc(db, "calendarEvents", calendarEventId), {
        status: "cancelled",
        unifiedStatus: "denied",
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();

    void notifyBookingDenied({
      actorId: actor.uid,
      actorName: actor.displayName,
      actorAvatarUrl: actor.avatarUrl ?? null,
      bookingId,
      calendarEventId,
      creatorId: booking.createdBy,
      title: booking.title,
      reason,
    }).catch(() => {});
  });
}

export async function cancelBooking(
  bookingId: string,
  actor: BookingMutationActor
): Promise<void> {
  return guardedMutation(mutationKey("booking", "cancel", bookingId), async () => {
    const db = tryGetFirestoreDb();
    if (!db) throw new Error("Firestore unavailable");

    const booking = await loadBooking(bookingId);
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const calendarEventId = booking.calendarEventId ?? undefined;
    const dateLabel = formatBookingDateRange(booking.startDate, booking.endDate);

    const cancelledEntry = buildActivityEntry("cancelled", actor.uid, actor.displayName);
    assertFirestoreWriteSafe({ activityLog: [cancelledEntry] }, "bookings cancel activityLog");
    const batch = writeBatch(db);
    batch.update(bookingRef, {
      status: "cancelled",
      updatedAt: serverTimestamp(),
      activityLog: arrayUnion(cancelledEntry),
    });
    if (calendarEventId) {
      batch.update(doc(db, "calendarEvents", calendarEventId), {
        status: "cancelled",
        unifiedStatus: "cancelled",
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();

    void notifyBookingCancelled({
      actorId: actor.uid,
      actorName: actor.displayName,
      actorAvatarUrl: actor.avatarUrl ?? null,
      bookingId,
      calendarEventId,
      title: booking.title,
      dateLabel,
      notifyUserIds: [booking.createdBy],
    }).catch(() => {});
  });
}

/** Soft-delete preserves history; use `permanentlyDeleteBooking` for hard removal. */
export async function softDeleteBooking(
  bookingId: string,
  actor: BookingMutationActor
): Promise<void> {
  return guardedMutation(mutationKey("booking", "soft-delete", bookingId), async () => {
    const db = tryGetFirestoreDb();
    if (!db) throw new Error("Firestore unavailable");

    const booking = await loadBooking(bookingId);
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const calendarEventId = booking.calendarEventId ?? undefined;

    const deletedEntry = buildActivityEntry("deleted", actor.uid, actor.displayName);
    assertFirestoreWriteSafe({ activityLog: [deletedEntry] }, "bookings delete activityLog");
    const batch = writeBatch(db);
    batch.update(bookingRef, {
      deleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: actor.uid,
      updatedAt: serverTimestamp(),
      activityLog: arrayUnion(deletedEntry),
    });
    if (calendarEventId) {
      batch.update(doc(db, "calendarEvents", calendarEventId), {
        status: "cancelled",
        unifiedStatus: "cancelled",
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  });
}

/** Admin-only permanent removal. */
export async function permanentlyDeleteBooking(bookingId: string): Promise<void> {
  return guardedMutation(mutationKey("booking", "hard-delete", bookingId), async () => {
    const db = tryGetFirestoreDb();
    if (!db) throw new Error("Firestore unavailable");

    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) return;
    const calendarEventId = bookingSnap.data()?.calendarEventId as string | undefined;

    await deleteDoc(bookingRef);
    if (calendarEventId) {
      try {
        await deleteDoc(doc(db, "calendarEvents", calendarEventId));
      } catch {
        /* optional linked event */
      }
    }
  });
}

/** @deprecated Use softDeleteBooking or permanentlyDeleteBooking */
export async function deleteBooking(bookingId: string): Promise<void> {
  return permanentlyDeleteBooking(bookingId);
}
