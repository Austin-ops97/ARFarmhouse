import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { actionDebug } from "@/lib/action-debug";
import { bookingEventTitle, rangesOverlap, TRIP_CALENDAR_META } from "@/lib/booking-calendar";
import { tryGetFirestoreDb } from "@/lib/firebase";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
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
} from "@/lib/property-operations";

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
  await addDoc(collection(db, "houseTasks"), {
    title: input.title.trim(),
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
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

function mapCalendarEventDoc(snap: QueryDocumentSnapshot<DocumentData>): PropertyCalendarEvent & {
  year: number;
  monthIndex: number;
} {
  const data = snap.data();
  return {
    id: snap.id,
    title: (data.title as string) ?? "",
    startDay: (data.startDay as number) ?? 1,
    endDay: data.endDay as number | undefined,
    timeLabel: data.timeLabel as string | undefined,
    kind: data.kind as PropertyCalendarEvent["kind"],
    accent: data.accent as PropertyCalendarEvent["accent"],
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
  return onSnapshot(
    collection(db, "calendarEvents"),
    (snap) => {
      const events = snap.docs
        .map(mapCalendarEventDoc)
        .filter((e) => e.year === year && e.monthIndex === monthIndex)
        .sort((a, b) => a.startDay - b.startDay)
        .map(({ year: _y, monthIndex: _m, ...event }) => event);
      onEvents(events);
    },
    (err) => {
      actionDebug("booking", "calendar subscribe error", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

async function loadMonthCalendarEvents(year: number, monthIndex: number) {
  const db = tryGetFirestoreDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, "calendarEvents"));
  return snap.docs
    .map(mapCalendarEventDoc)
    .filter((e) => e.year === year && e.monthIndex === monthIndex);
}

export type BookingRequestPayload = {
  tripId: string;
  guests: number;
  roomId: string;
  startDay: number;
  endDay: number;
  notes: string;
  tripPurpose: string;
  year: number;
  monthIndex: number;
  requestedBy: string;
  requestedByName: string;
};

export type BookingSubmitResult = {
  bookingRequestId: string;
  calendarEventId: string;
};

export async function createBookingRequest(input: BookingRequestPayload): Promise<BookingSubmitResult> {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");

  const startDay = Math.min(input.startDay, input.endDay);
  const endDay = Math.max(input.startDay, input.endDay);
  if (startDay < 1 || endDay < startDay) {
    throw new Error("Pick a valid date range on the calendar.");
  }

  actionDebug("booking", "submit start", { startDay, endDay, year: input.year, monthIndex: input.monthIndex });

  const existing = await loadMonthCalendarEvents(input.year, input.monthIndex);
  const conflict = existing.find((e) =>
    rangesOverlap(startDay, endDay, e.startDay, e.endDay ?? e.startDay)
  );
  if (conflict) {
    throw new Error(
      `Those dates overlap "${conflict.title}". Adjust your range or ask the family to confirm the existing stay.`
    );
  }

  const meta = TRIP_CALENDAR_META[input.tripId] ?? TRIP_CALENDAR_META.family;
  const title = bookingEventTitle(input.tripPurpose, input.tripId, input.guests);
  const timeLabel = input.guests ? `${input.guests} guest${input.guests === 1 ? "" : "s"}` : undefined;

  const batch = writeBatch(db);
  const bookingRef = doc(collection(db, "bookingRequests"));
  const eventRef = doc(collection(db, "calendarEvents"));

  batch.set(bookingRef, {
    ...input,
    startDay,
    endDay,
    status: "pending",
    calendarEventId: eventRef.id,
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
    notes: input.notes,
    tripPurpose: input.tripPurpose,
    requestedBy: input.requestedBy,
    requestedByName: input.requestedByName,
    bookingRequestId: bookingRef.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    actionDebug("booking", "submit complete", {
      bookingRequestId: bookingRef.id,
      calendarEventId: eventRef.id,
    });
    return { bookingRequestId: bookingRef.id, calendarEventId: eventRef.id };
  } catch (e) {
    actionDebug("booking", "submit failed", e);
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
      };
    },
    onItems,
    onError
  );
}
