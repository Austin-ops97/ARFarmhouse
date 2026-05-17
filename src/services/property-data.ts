import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { calendarDayRangeToTimestamps } from "@/lib/booking-dates";
import { BOOKINGS_COLLECTION } from "@/models/booking";
import { actionDebug } from "@/lib/action-debug";
import { bookingEventTitle, TRIP_CALENDAR_META } from "@/lib/booking-calendar";
import {
  BOOKING_CONFLICT_MESSAGE,
  findOverlappingCalendarEvent,
  type CalendarEventRange,
} from "@/lib/booking-conflicts";
import { tryGetFirestoreDb } from "@/lib/firebase";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import { TASK_DELETE_COOLDOWN_MS } from "@/lib/task-constants";
import type {
  HouseTask,
  PropertyInventoryItem,
  PropertyMapPin,
  PropertyMapTrail,
  PropertyResource,
  PropertyStatusCard,
  TaskBoardColumn,
  TaskListSection,
  TaskPriority,
  TaskSource,
} from "@/lib/property-operations";

function timestampToMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return null;
}

function subscribeCollection<T>(
  path: string,
  mapDoc: (snap: QueryDocumentSnapshot<DocumentData>) => T,
  onRows: (rows: T[]) => void,
  onError?: (e: Error) => void,
  sortKey?: (row: T) => number
): () => void {
  const db = tryGetFirestoreDb();
  if (!db) {
    onRows([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const rows = snap.docs.map(mapDoc);
      if (sortKey) rows.sort((a, b) => sortKey(a) - sortKey(b));
      onRows(rows);
    },
    (err) => {
      actionDebug("property", `${path} subscribe error`, err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

export function subscribeHouseTasks(
  onTasks: (tasks: HouseTask[]) => void,
  onError?: (e: Error) => void
) {
  return subscribeCollection(
    "houseTasks",
    (snap) => {
      const d = snap.data();
      return {
        id: snap.id,
        title: (d.title as string) ?? "",
        listSection: (d.listSection as TaskListSection) ?? "active",
        boardColumn: (d.boardColumn as TaskBoardColumn) ?? "todo",
        boardOrder: typeof d.boardOrder === "number" ? d.boardOrder : 0,
        priority: (d.priority as TaskPriority) ?? "medium",
        dueLabel: (d.dueLabel as string) ?? "",
        done: Boolean(d.done),
        assignee: {
          name: (d.assigneeName as string) ?? "House",
          avatar: (d.assigneeAvatar as string) ?? "",
        },
        photoThumbs: Array.isArray(d.photoThumbs) ? (d.photoThumbs as string[]) : undefined,
        commentsPreview: Array.isArray(d.commentsPreview)
          ? (d.commentsPreview as { author: string; text: string }[])
          : [],
        deleteScheduledAt: timestampToMs(d.deleteScheduledAt),
        source: (d.source as TaskSource | undefined) ?? undefined,
        routineId: (d.routineId as string | undefined) ?? undefined,
        description: (d.description as string | undefined) ?? undefined,
      };
    },
    (rows) => onTasks([...rows].sort((a, b) => a.boardOrder - b.boardOrder)),
    onError
  );
}

export async function createHouseTask(input: {
  title: string;
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  listSection?: TaskListSection;
  boardColumn?: TaskBoardColumn;
  priority?: TaskPriority;
  dueLabel?: string;
}) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const listSection = input.listSection ?? "active";
  const boardColumn = input.boardColumn ?? "todo";
  const taskTitle = input.title.trim();
  const ref = await addDoc(collection(db, "houseTasks"), {
    title: taskTitle,
    listSection,
    boardColumn,
    boardOrder: Date.now(),
    sortOrder: Date.now(),
    priority: input.priority ?? "medium",
    dueLabel: input.dueLabel ?? "Soon",
    done: false,
    assigneeName: input.displayName,
    assigneeAvatar: input.avatarUrl ?? "",
    commentsPreview: [],
    createdBy: input.uid,
    createdByName: input.displayName,
    source: "manual",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateHouseTask(taskId: string, patch: Partial<HouseTask>) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.listSection !== undefined) data.listSection = patch.listSection;
  if (patch.boardColumn !== undefined) data.boardColumn = patch.boardColumn;
  if (patch.boardOrder !== undefined) data.boardOrder = patch.boardOrder;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.dueLabel !== undefined) data.dueLabel = patch.dueLabel;
  if (patch.done !== undefined) data.done = patch.done;
  if (patch.assignee !== undefined) {
    data.assigneeName = patch.assignee.name;
    data.assigneeAvatar = patch.assignee.avatar;
  }
  await updateDoc(doc(db, "houseTasks", taskId), data);
}

export async function deleteHouseTask(taskId: string) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  await deleteDoc(doc(db, "houseTasks", taskId));
}

/** Mark complete and schedule automatic deletion after cooldown. */
export async function completeHouseTaskWithCooldown(taskId: string) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const deleteAt = Timestamp.fromMillis(Date.now() + TASK_DELETE_COOLDOWN_MS);
  await updateDoc(doc(db, "houseTasks", taskId), {
    done: true,
    listSection: "completed",
    boardColumn: "done",
    deleteScheduledAt: deleteAt,
    updatedAt: serverTimestamp(),
  });
}

/** Undo completion during the deletion cooldown window. */
export async function undoHouseTaskCompletion(taskId: string) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  await updateDoc(doc(db, "houseTasks", taskId), {
    done: false,
    listSection: "active",
    boardColumn: "todo",
    deleteScheduledAt: null,
    updatedAt: serverTimestamp(),
  });
}

/** Delete tasks whose cooldown has expired (safe to call on load and on interval). */
export async function purgeExpiredPendingDeleteTasks(): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;
  const now = Timestamp.now();
  const q = query(collection(db, "houseTasks"), where("deleteScheduledAt", "<=", now));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
}

export async function persistHouseTasksBatch(tasks: HouseTask[]) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  await Promise.all(
    tasks.map((t) =>
      updateDoc(doc(db, "houseTasks", t.id), {
        listSection: t.listSection,
        boardColumn: t.boardColumn,
        boardOrder: t.boardOrder,
        done: t.done,
        updatedAt: serverTimestamp(),
      })
    )
  );
}

function mapCalendarEventDoc(snap: QueryDocumentSnapshot<DocumentData>): PropertyCalendarEvent {
  const data = snap.data();
  const startDay = (data.startDay as number) ?? 1;
  const endDay = (data.endDay as number) ?? startDay;
  const status = data.status === "confirmed" || data.status === "cancelled" ? data.status : "pending";
  return {
    id: snap.id,
    title: (data.title as string) ?? "",
    startDay,
    endDay,
    timeLabel: data.timeLabel as string | undefined,
    kind: (data.kind as PropertyCalendarEvent["kind"]) ?? "family_booking",
    accent: (data.accent as PropertyCalendarEvent["accent"]) ?? "mint",
    status,
    guests: typeof data.guests === "number" ? data.guests : 0,
    tripId: (data.tripId as string) ?? "family",
    tripPurpose: (data.tripPurpose as string) ?? "",
    notes: (data.notes as string) ?? "",
    requestedBy: (data.requestedBy as string) ?? "",
    requestedByName: (data.requestedByName as string) ?? "Member",
    attendeeLabels: Array.isArray(data.attendeeLabels) ? (data.attendeeLabels as string[]) : [],
    attendeePetIds: Array.isArray(data.attendeePetIds) ? (data.attendeePetIds as string[]) : [],
    year: (data.year as number) ?? 0,
    monthIndex: (data.monthIndex as number) ?? 0,
  };
}

export function subscribeCalendarEvents(
  year: number,
  monthIndex: number,
  onEvents: (events: PropertyCalendarEvent[]) => void,
  onError?: (e: Error) => void
) {
  const db = tryGetFirestoreDb();
  if (!db) {
    onEvents([]);
    return () => {};
  }
  const monthQuery = query(
    collection(db, "calendarEvents"),
    where("year", "==", year),
    where("monthIndex", "==", monthIndex)
  );
  return onSnapshot(
    monthQuery,
    (snap) => {
      const events = snap.docs.map(mapCalendarEventDoc).sort((a, b) => a.startDay - b.startDay);
      onEvents(events);
    },
    (err) => {
      actionDebug("booking", "calendar subscribe error", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

function mapCalendarEventRange(snap: QueryDocumentSnapshot<DocumentData>): CalendarEventRange {
  const mapped = mapCalendarEventDoc(snap);
  return {
    id: mapped.id,
    title: mapped.title,
    startDay: mapped.startDay,
    endDay: mapped.endDay,
    year: mapped.year,
    monthIndex: mapped.monthIndex,
  };
}

export type BookingRequestPayload = {
  tripId: string;
  guests: number;
  roomId: string;
  startDay: number;
  endDay: number;
  notes: string;
  tripPurpose: string;
  tripTitle?: string;
  year: number;
  monthIndex: number;
  requestedBy: string;
  requestedByName: string;
  requestedByAvatarUrl?: string | null;
  ownerUid: string;
  includeSelf: boolean;
  attendeeMemberIds: string[];
  attendeePetIds: string[];
  attendeeLabels: string[];
};

export type BookingSubmitResult = {
  bookingId: string;
  bookingRequestId: string;
  calendarEventId: string;
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

export async function createBookingRequest(input: BookingRequestPayload): Promise<BookingSubmitResult> {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");

  const startDay = Math.min(input.startDay, input.endDay);
  const endDay = Math.max(input.startDay, input.endDay);
  if (startDay < 1 || endDay < startDay) {
    throw new Error("Pick a valid date range on the calendar.");
  }

  actionDebug("booking", "submit start", { startDay, endDay, year: input.year, monthIndex: input.monthIndex });

  const meta = TRIP_CALENDAR_META[input.tripId] ?? TRIP_CALENDAR_META.family;
  const title =
    input.tripTitle?.trim() ||
    bookingEventTitle(input.tripPurpose, input.tripId, input.guests);
  const timeLabel = input.guests ? `${input.guests} guest${input.guests === 1 ? "" : "s"}` : undefined;

  const bookingRef = doc(collection(db, "bookingRequests"));
  const eventRef = doc(collection(db, "calendarEvents"));
  const unifiedBookingRef = doc(collection(db, BOOKINGS_COLLECTION));
  requireDocumentRef(bookingRef, "bookingRequests");
  requireDocumentRef(eventRef, "calendarEvents");
  requireDocumentRef(unifiedBookingRef, BOOKINGS_COLLECTION);

  try {
    const monthEventsQuery = query(
      collection(db, "calendarEvents"),
      where("year", "==", input.year),
      where("monthIndex", "==", input.monthIndex)
    );
    const eventsSnap = await getDocs(monthEventsQuery);
    const existing = eventsSnap.docs.map(mapCalendarEventRange);
    actionDebug("booking", "overlap check", { existing: existing.length });
    const conflict = findOverlappingCalendarEvent(
      existing,
      input.year,
      input.monthIndex,
      startDay,
      endDay
    );
    if (conflict) {
      throw new Error(
        `Those dates overlap "${conflict.title}". Adjust your range or ask the family to confirm the existing stay.`
      );
    }

    const description = input.notes.trim() || input.tripPurpose.trim();
    const { startDate, endDate } = calendarDayRangeToTimestamps(
      input.year,
      input.monthIndex,
      startDay,
      endDay
    );

    const batch = writeBatch(db);
    batch.set(bookingRef, {
      ...input,
      startDay,
      endDay,
      status: "pending",
      calendarEventId: eventRef.id,
      bookingId: unifiedBookingRef.id,
      createdAt: serverTimestamp(),
    });
    batch.set(eventRef, {
      title,
      startDay,
      endDay,
      year: input.year,
      monthIndex: input.monthIndex,
      kind: meta.kind,
      accent: meta.accent,
      timeLabel,
      status: "pending",
      tripId: input.tripId,
      roomId: input.roomId,
      guests: input.guests,
      ownerUid: input.ownerUid,
      includeSelf: input.includeSelf,
      attendeeMemberIds: input.attendeeMemberIds,
      attendeePetIds: input.attendeePetIds,
      attendeeLabels: input.attendeeLabels,
      notes: input.notes,
      tripPurpose: input.tripPurpose,
      tripTitle: input.tripTitle?.trim() || null,
      requestedBy: input.requestedBy,
      requestedByName: input.requestedByName,
      bookingRequestId: bookingRef.id,
      bookingId: unifiedBookingRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(unifiedBookingRef, {
      title,
      description,
      type: "booking",
      startDate,
      endDate,
      status: "pending",
      createdBy: input.requestedBy,
      createdByName: input.requestedByName,
      approvedBy: null,
      approvedAt: null,
      deniedReason: null,
      calendarEventId: eventRef.id,
      legacyBookingRequestId: bookingRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    const bookingId = unifiedBookingRef.id;

    actionDebug("booking", "submit complete", {
      bookingId,
      bookingRequestId: bookingRef.id,
      calendarEventId: eventRef.id,
    });

    const monthWord = new Date(input.year, input.monthIndex, 1).toLocaleString("en-US", {
      month: "long",
    });
    return {
      bookingId,
      bookingRequestId: bookingRef.id,
      calendarEventId: eventRef.id,
    };
  } catch (e) {
    actionDebug("booking", "submit failed", e);
    if (e instanceof Error) {
      if (e.message.includes("overlap")) throw e;
      if (e.message.includes("failed-precondition") || e.message.includes("aborted")) {
        throw new Error(BOOKING_CONFLICT_MESSAGE);
      }
    }
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
      throw new Error("Could not save the booking. Check that you are signed in and Firestore rules allow writes.");
    }
    throw new Error(`Could not save the booking. ${msg}`);
  }
}

export function subscribePropertyStatus(onCards: (cards: PropertyStatusCard[]) => void, onError?: (e: Error) => void) {
  return subscribeCollection(
    "propertyStatus",
    (snap) => {
      const d = snap.data();
      return {
        id: snap.id,
        title: (d.title as string) ?? "",
        value: (d.value as string) ?? "",
        hint: d.hint as string | undefined,
        icon: d.icon as PropertyStatusCard["icon"],
        tone: d.tone as PropertyStatusCard["tone"],
      };
    },
    onCards,
    onError
  );
}

export function subscribePropertyMapPins(onPins: (pins: PropertyMapPin[]) => void, onError?: (e: Error) => void) {
  return subscribeCollection(
    "propertyMapPins",
    (snap) => {
      const d = snap.data();
      return {
        id: snap.id,
        label: (d.label as string) ?? "",
        kind: d.kind as PropertyMapPin["kind"],
        x: (d.x as number) ?? 0,
        y: (d.y as number) ?? 0,
        blurb: (d.blurb as string) ?? "",
        trailCondition: d.trailCondition as PropertyMapPin["trailCondition"],
        linkedEvent: typeof d.linkedEvent === "string" ? d.linkedEvent : undefined,
        favorite: Boolean(d.favorite),
      };
    },
    onPins,
    onError
  );
}

export function subscribePropertyMapTrails(onTrails: (trails: PropertyMapTrail[]) => void, onError?: (e: Error) => void) {
  return subscribeCollection(
    "propertyMapTrails",
    (snap) => {
      const d = snap.data();
      return {
        id: snap.id,
        name: (d.name as string) ?? "",
        d: (d.d as string) ?? "",
        condition: (d.condition as string) ?? "",
      };
    },
    onTrails,
    onError
  );
}

export function subscribePropertyResources(
  onResources: (rows: PropertyResource[]) => void,
  onError?: (e: Error) => void
) {
  return subscribeCollection(
    "propertyResources",
    (snap) => {
      const d = snap.data();
      return {
        id: snap.id,
        category: (d.category as string) ?? "",
        title: (d.title as string) ?? "",
        summary: (d.summary as string) ?? "",
        detail: (d.detail as string) ?? "",
        tags: Array.isArray(d.tags) ? (d.tags as string[]) : [],
        status: d.status as PropertyResource["status"],
        notes: typeof d.notes === "string" ? d.notes : undefined,
      };
    },
    onResources,
    onError
  );
}

export function subscribePropertyInventory(
  onItems: (items: PropertyInventoryItem[]) => void,
  onError?: (e: Error) => void
) {
  return subscribeCollection(
    "propertyInventory",
    (snap) => {
      const d = snap.data();
      return {
        id: snap.id,
        label: (d.label as string) ?? "",
        pct: (d.pct as number) ?? 0,
        unit: (d.unit as string) ?? "",
        lastUpdatedBy: (d.lastUpdatedBy as string) ?? "",
        lastUpdated: (d.lastUpdated as string) ?? "",
        restockHint: d.restockHint as string | undefined,
        low: Boolean(d.low),
        category: d.category as PropertyInventoryItem["category"],
      };
    },
    onItems,
    onError
  );
}

export type SharedGrocerKind = "meal" | "grocery";

export type SharedGroceryItemRow = {
  id: string;
  kind: SharedGrocerKind;
  label: string;
  assignmentHint: string;
  claimedByUid: string;
  claimedByName: string;
  done: boolean;
  createdByUid: string;
  boardOrder: number;
};

/** Collaborative grocery + meal plan list for trip coordination. */
export function subscribeSharedGroceryItems(
  onRows: (rows: SharedGroceryItemRow[]) => void,
  onError?: (e: Error) => void
) {
  return subscribeCollection(
    "sharedGroceryItems",
    (snap) => {
      const d = snap.data();
      const kindRaw = (d.kind as string) ?? "grocery";
      const kind: SharedGrocerKind = kindRaw === "meal" ? "meal" : "grocery";
      return {
        id: snap.id,
        kind,
        label: (d.label as string) ?? "",
        assignmentHint: (d.assignmentHint as string) ?? "",
        claimedByUid: (d.claimedByUid as string) ?? "",
        claimedByName: (d.claimedByName as string) ?? "",
        done: Boolean(d.done),
        createdByUid: (d.createdByUid as string) ?? "",
        boardOrder: typeof d.boardOrder === "number" ? d.boardOrder : 0,
      };
    },
    onRows,
    onError,
    (row) => -row.boardOrder
  );
}

export async function createSharedGroceryItem(input: {
  kind: SharedGrocerKind;
  label: string;
  assignmentHint?: string;
  claimedByUid?: string;
  claimedByName?: string;
  createdByUid: string;
}) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const label = input.label.trim();
  if (!label) throw new Error("Enter a label");
  await addDoc(collection(db, "sharedGroceryItems"), {
    kind: input.kind,
    label,
    assignmentHint: (input.assignmentHint ?? "").trim(),
    claimedByUid: input.claimedByUid ?? "",
    claimedByName: input.claimedByName ?? "",
    done: false,
    createdByUid: input.createdByUid,
    boardOrder: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateSharedGroceryItem(itemId: string, patch: Partial<Pick<SharedGroceryItemRow, "done" | "claimedByUid" | "claimedByName" | "assignmentHint">>) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const ref = doc(db, "sharedGroceryItems", itemId);
  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.done !== undefined) update.done = patch.done;
  if (patch.claimedByUid !== undefined) update.claimedByUid = patch.claimedByUid;
  if (patch.claimedByName !== undefined) update.claimedByName = patch.claimedByName;
  if (patch.assignmentHint !== undefined) update.assignmentHint = patch.assignmentHint;
  await updateDoc(ref, update);
}

export async function deleteSharedGroceryItem(itemId: string, viewerUid: string, createdByUid: string) {
  if (viewerUid !== createdByUid) throw new Error("Only the creator can remove items");
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  await deleteDoc(doc(db, "sharedGroceryItems", itemId));
}
