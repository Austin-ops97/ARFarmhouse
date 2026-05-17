import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";

import {
  advanceNextRunPastDue,
  routineGeneratedTaskId,
  type RoutineIntervalUnit,
} from "./routine-schedule";

const ROUTINES = "routines";
const HOUSE_TASKS = "houseTasks";

type RoutineDoc = {
  title?: string;
  description?: string;
  intervalValue?: number;
  intervalUnit?: RoutineIntervalUnit;
  nextRunAt?: Timestamp;
  isActive?: boolean;
  createdBy?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  priority?: string;
  category?: string;
};

async function processRoutine(routineId: string, data: RoutineDoc): Promise<void> {
  const db = getFirestore();
  const routineRef = db.collection(ROUTINES).doc(routineId);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await db.runTransaction(async (txn) => {
    const snap = await txn.get(routineRef);
    if (!snap.exists) return;
    const d = snap.data() as RoutineDoc;
    if (d.isActive === false) return;

    const nextRun = d.nextRunAt;
    if (!nextRun || nextRun.toDate().getTime() > todayStart.getTime()) return;

    const intervalValue = typeof d.intervalValue === "number" ? d.intervalValue : 1;
    const intervalUnit = (d.intervalUnit as RoutineIntervalUnit) ?? "months";
    const dueAt = nextRun.toDate();
    const dueMs = dueAt.getTime();
    const taskId = routineGeneratedTaskId(routineId, dueMs);
    const taskRef = db.collection(HOUSE_TASKS).doc(taskId);

    const existing = await txn.get(taskRef);
    if (!existing.exists) {
      const title = (d.title ?? "Routine task").trim();
      const description = (d.description ?? "").trim();
      const priority = d.priority ?? "medium";
      const dueLabel = dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const listSection = d.category === "maintenance" ? "maintenance" : "active";

      txn.set(taskRef, {
        title,
        description,
        listSection,
        boardColumn: "todo",
        boardOrder: dueMs,
        sortOrder: dueMs,
        priority,
        dueLabel,
        done: false,
        assigneeName: d.assigneeName ?? "House",
        assigneeAvatar: d.assigneeAvatar ?? "",
        commentsPreview: [],
        source: "routine",
        routineId,
        dueDate: Timestamp.fromDate(dueAt),
        createdBy: d.createdBy ?? "",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    const advanced = advanceNextRunPastDue(dueAt, intervalValue, intervalUnit, now);
    txn.update(routineRef, {
      nextRunAt: Timestamp.fromDate(advanced),
      lastGeneratedAt: Timestamp.fromDate(dueAt),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

/** Runs hourly — generates due routine tasks and advances schedules. */
export const generateDueRoutineTasks = onSchedule(
  {
    schedule: "every 60 minutes",
    region: "us-central1",
    timeZone: "America/Chicago",
  },
  async () => {
    const db = getFirestore();
    const now = Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0)));
    const snap = await db
      .collection(ROUTINES)
      .where("isActive", "==", true)
      .where("nextRunAt", "<=", now)
      .get();

    logger.info("[routines] due routines", { count: snap.size });

    for (const doc of snap.docs) {
      try {
        await processRoutine(doc.id, doc.data() as RoutineDoc);
      } catch (err) {
        logger.error("[routines] failed to process routine", { routineId: doc.id, err });
      }
    }
  }
);
