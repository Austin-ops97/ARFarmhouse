"use client";

import { useEffect, useMemo, useState } from "react";

import { TASK_DELETE_COOLDOWN_MS } from "@/lib/task-constants";
import type { HouseTask } from "@/lib/property-operations";
import { deleteHouseTask, purgeExpiredPendingDeleteTasks } from "@/services/property-data";

function secondsRemaining(deleteScheduledAt: number): number {
  return Math.max(0, Math.ceil((deleteScheduledAt - Date.now()) / 1000));
}

/** Tracks per-task deletion countdown and purges expired tasks. */
export function useTaskPendingDelete(tasks: readonly HouseTask[]) {
  const [tick, setTick] = useState(0);

  const pendingIds = useMemo(
    () =>
      tasks
        .filter((t) => typeof t.deleteScheduledAt === "number" && t.deleteScheduledAt > Date.now())
        .map((t) => t.id),
    [tasks]
  );

  useEffect(() => {
    void purgeExpiredPendingDeleteTasks();
  }, []);

  useEffect(() => {
    if (pendingIds.length === 0) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [pendingIds.length]);

  useEffect(() => {
    const expired = tasks.filter(
      (t) => typeof t.deleteScheduledAt === "number" && t.deleteScheduledAt <= Date.now()
    );
    if (expired.length === 0) return;
    void Promise.all(expired.map((t) => deleteHouseTask(t.id).catch(() => {})));
  }, [tasks, tick]);

  const countdownById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      if (typeof t.deleteScheduledAt === "number" && t.deleteScheduledAt > Date.now()) {
        map[t.id] = secondsRemaining(t.deleteScheduledAt);
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick drives countdown refresh
  }, [tasks, tick]);

  const isPendingDelete = (taskId: string) => taskId in countdownById;

  return { countdownById, isPendingDelete, cooldownMs: TASK_DELETE_COOLDOWN_MS };
}
