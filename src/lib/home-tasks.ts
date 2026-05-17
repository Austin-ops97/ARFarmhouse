import type { HouseTask, TaskPriority } from "@/lib/property-operations";

const PRIORITY_RANK: Record<TaskPriority, number> = {
  emergency: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const COLUMN_RANK = { todo: 0, doing: 1, done: 2 } as const;

/** Top active tasks for the home dashboard — urgent and in-progress first. */
export function pickTopHomeTasks(tasks: readonly HouseTask[], limit = 3): HouseTask[] {
  return [...tasks]
    .filter(
      (t) =>
        !t.done &&
        t.listSection !== "completed" &&
        t.boardColumn !== "done" &&
        !(typeof t.deleteScheduledAt === "number" && t.deleteScheduledAt > Date.now())
    )
    .sort((a, b) => {
      const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (pr !== 0) return pr;
      const cr = COLUMN_RANK[a.boardColumn] - COLUMN_RANK[b.boardColumn];
      if (cr !== 0) return cr;
      if (a.dueLabel && !b.dueLabel) return -1;
      if (!a.dueLabel && b.dueLabel) return 1;
      return a.boardOrder - b.boardOrder;
    })
    .slice(0, limit);
}
