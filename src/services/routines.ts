import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { actionDebug } from "@/lib/action-debug";
import type { HouseRoutine, RoutineIntervalUnit, TaskPriority } from "@/lib/property-operations";
import {
  advanceNextRunPastDue,
  resolveInitialNextRunAt,
  routineGeneratedTaskId,
  startOfDay,
} from "@/lib/routine-schedule";
import { tryGetFirestoreDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/platform/constants/collections";

const ROUTINES = COLLECTIONS.routines;
const TASKS = COLLECTIONS.houseTasks;

function timestampToMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return null;
}

function mapRoutineDoc(snap: QueryDocumentSnapshot<DocumentData>): HouseRoutine {
  const d = snap.data();
  return {
    id: snap.id,
    title: (d.title as string) ?? "",
    description: (d.description as string) ?? "",
    intervalValue: typeof d.intervalValue === "number" ? d.intervalValue : 1,
    intervalUnit: (d.intervalUnit as RoutineIntervalUnit) ?? "months",
    startDateMs: timestampToMs(d.startDate) ?? Date.now(),
    nextRunAtMs: timestampToMs(d.nextRunAt) ?? Date.now(),
    lastGeneratedAtMs: timestampToMs(d.lastGeneratedAt),
    isActive: d.isActive !== false,
    createdBy: (d.createdBy as string) ?? "",
    assigneeName: (d.assigneeName as string) ?? "House",
    assigneeAvatar: (d.assigneeAvatar as string) ?? "",
    priority: (d.priority as TaskPriority) ?? "medium",
    category: (d.category as string) ?? "",
  };
}

export function subscribeHouseRoutines(
  onRoutines: (routines: HouseRoutine[]) => void,
  onError?: (e: Error) => void
): () => void {
  const db = tryGetFirestoreDb();
  if (!db) {
    onRoutines([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, ROUTINES),
    (snap) => {
      const rows = snap.docs.map(mapRoutineDoc);
      rows.sort((a, b) => a.nextRunAtMs - b.nextRunAtMs || a.title.localeCompare(b.title));
      onRoutines(rows);
    },
    (err) => {
      actionDebug("routines", "subscribe error", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

export async function createHouseRoutine(input: {
  title: string;
  description?: string;
  intervalValue: number;
  intervalUnit: RoutineIntervalUnit;
  startDate: Date;
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  priority?: TaskPriority;
  category?: string;
  isActive?: boolean;
}) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");

  const start = startOfDay(input.startDate);
  const nextRunAt = resolveInitialNextRunAt(start, input.intervalValue, input.intervalUnit);

  const ref = await addDoc(collection(db, ROUTINES), {
    title: input.title.trim(),
    description: (input.description ?? "").trim(),
    intervalValue: input.intervalValue,
    intervalUnit: input.intervalUnit,
    startDate: Timestamp.fromDate(start),
    nextRunAt: Timestamp.fromDate(nextRunAt),
    lastGeneratedAt: null,
    isActive: input.isActive !== false,
    createdBy: input.uid,
    assigneeName: input.displayName,
    assigneeAvatar: input.avatarUrl ?? "",
    priority: input.priority ?? "medium",
    category: input.category ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateHouseRoutine(
  routineId: string,
  patch: Partial<{
    title: string;
    description: string;
    intervalValue: number;
    intervalUnit: RoutineIntervalUnit;
    startDate: Date;
    isActive: boolean;
    priority: TaskPriority;
    category: string;
    assigneeName: string;
    assigneeAvatar: string;
  }>
) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");

  const ref = doc(db, ROUTINES, routineId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Routine not found");
  const current = mapRoutineDoc(snap as QueryDocumentSnapshot<DocumentData>);

  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.title !== undefined) data.title = patch.title.trim();
  if (patch.description !== undefined) data.description = patch.description.trim();
  if (patch.intervalValue !== undefined) data.intervalValue = patch.intervalValue;
  if (patch.intervalUnit !== undefined) data.intervalUnit = patch.intervalUnit;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.category !== undefined) data.category = patch.category;
  if (patch.assigneeName !== undefined) data.assigneeName = patch.assigneeName;
  if (patch.assigneeAvatar !== undefined) data.assigneeAvatar = patch.assigneeAvatar;

  const scheduleChanged =
    patch.startDate !== undefined || patch.intervalValue !== undefined || patch.intervalUnit !== undefined;

  if (scheduleChanged) {
    const startDate = patch.startDate ?? new Date(current.startDateMs);
    const intervalValue = patch.intervalValue ?? current.intervalValue;
    const intervalUnit = patch.intervalUnit ?? current.intervalUnit;
    const start = startOfDay(startDate);
    data.startDate = Timestamp.fromDate(start);
    data.nextRunAt = Timestamp.fromDate(resolveInitialNextRunAt(start, intervalValue, intervalUnit));
  } else if (patch.isActive === true && !current.isActive) {
    const nextRunAt = advanceNextRunPastDue(
      new Date(current.nextRunAtMs),
      current.intervalValue,
      current.intervalUnit
    );
    data.nextRunAt = Timestamp.fromDate(nextRunAt);
  }

  await updateDoc(ref, data);
}

export async function deleteHouseRoutine(routineId: string) {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  await deleteDoc(doc(db, ROUTINES, routineId));
}

/** Transaction-safe generation for one routine (client fallback + shared with scheduler logic). */
export async function generateRoutineTaskIfDue(routineId: string): Promise<boolean> {
  const db = tryGetFirestoreDb();
  if (!db) return false;

  const routineRef = doc(db, ROUTINES, routineId);
  const now = new Date();
  const todayStart = startOfDay(now).getTime();

  return runTransaction(db, async (txn) => {
    const snap = await txn.get(routineRef);
    if (!snap.exists()) return false;
    const d = snap.data();
    if (d.isActive === false) return false;

    const nextRunMs = timestampToMs(d.nextRunAt);
    if (nextRunMs === null || nextRunMs > todayStart) return false;

    const intervalValue = typeof d.intervalValue === "number" ? d.intervalValue : 1;
    const intervalUnit = (d.intervalUnit as RoutineIntervalUnit) ?? "months";
    const dueAt = new Date(nextRunMs);
    const taskId = routineGeneratedTaskId(routineId, nextRunMs);
    const taskRef = doc(db, TASKS, taskId);

    const existing = await txn.get(taskRef);
    if (!existing.exists()) {
      const title = ((d.title as string) ?? "Routine task").trim();
      const description = ((d.description as string) ?? "").trim();
      const priority = (d.priority as TaskPriority) ?? "medium";
      const dueLabel = dueAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

      txn.set(taskRef, {
        title,
        description,
        listSection: d.category === "maintenance" ? "maintenance" : "active",
        boardColumn: "todo",
        boardOrder: nextRunMs,
        sortOrder: nextRunMs,
        priority,
        dueLabel,
        done: false,
        assigneeName: (d.assigneeName as string) ?? "House",
        assigneeAvatar: (d.assigneeAvatar as string) ?? "",
        commentsPreview: [],
        source: "routine",
        routineId,
        dueDate: Timestamp.fromDate(dueAt),
        createdBy: (d.createdBy as string) ?? "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const advanced = advanceNextRunPastDue(dueAt, intervalValue, intervalUnit, now);
    txn.update(routineRef, {
      nextRunAt: Timestamp.fromDate(advanced),
      lastGeneratedAt: Timestamp.fromDate(dueAt),
      updatedAt: serverTimestamp(),
    });
    return true;
  });
}

/** Best-effort client sweep when scheduler has not run yet. */
export async function tryGenerateDueRoutineTasks(): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;

  const now = Timestamp.fromDate(startOfDay(new Date()));
  const q = query(collection(db, ROUTINES), where("isActive", "==", true), where("nextRunAt", "<=", now));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => generateRoutineTaskIfDue(d.id).catch(() => {})));
}
