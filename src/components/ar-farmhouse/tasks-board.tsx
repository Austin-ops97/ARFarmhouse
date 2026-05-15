"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";

import { TaskCard } from "@/components/ar-farmhouse/task-card";
import type { HouseTask, TaskBoardColumn } from "@/lib/property-operations";
import { cn } from "@/lib/utils";

const COLUMNS: TaskBoardColumn[] = ["todo", "doing", "done"];

const columnTitle: Record<TaskBoardColumn, string> = {
  todo: "Planning",
  doing: "In motion",
  done: "Wrapped",
};

function normalizeBoardOrders(ts: HouseTask[]): HouseTask[] {
  let next = [...ts];
  for (const col of COLUMNS) {
    const inCol = next
      .filter((t) => t.boardColumn === col)
      .sort((a, b) => a.boardOrder - b.boardOrder);
    inCol.forEach((t, i) => {
      next = next.map((x) => (x.id === t.id ? { ...x, boardOrder: i } : x));
    });
  }
  return next;
}

function SortableRow({ task, onToggleDone }: { task: HouseTask; onToggleDone: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-10")}>
      <TaskCard
        task={task}
        dragHandle
        dragListeners={listeners}
        dragAttributes={attributes}
        isDragging={isDragging}
        onToggleDone={onToggleDone}
      />
    </div>
  );
}

function ColumnShell({
  col,
  count,
  children,
}: {
  col: TaskBoardColumn;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop-${col}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[260px] min-w-0 flex-1 flex-col rounded-[1.25rem] border border-border/55 bg-muted/35 p-2 transition-colors sm:min-h-[300px] sm:p-3",
        "dark:border-white/10 dark:bg-white/[0.02]",
        isOver && "border-primary/40 bg-primary/10 dark:bg-primary/[0.06]"
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{columnTitle[col]}</p>
        <span className="rounded-full border border-border/50 bg-card/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:border-white/10 dark:bg-white/[0.05]">
          {count}
        </span>
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.55" } } }),
};

export function TasksBoard({
  tasks,
  onTasksChange,
  onToggleDone,
}: {
  tasks: HouseTask[];
  onTasksChange: (next: HouseTask[]) => void;
  onToggleDone: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 12 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } })
  );

  const byColumn = useMemo(() => {
    const map: Record<TaskBoardColumn, HouseTask[]> = { todo: [], doing: [], done: [] };
    for (const col of COLUMNS) {
      map[col] = tasks
        .filter((t) => t.boardColumn === col)
        .sort((a, b) => a.boardOrder - b.boardOrder);
    }
    return map;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  if (tasks.length === 0) {
    return (
      <div className="rounded-[1.35rem] border border-border/55 bg-muted/25 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
        <p className="font-heading text-lg font-semibold text-foreground">Board is clear</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Drag cards between columns when tasks exist — for now, nothing is in flight.
        </p>
      </div>
    );
  }

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const aId = String(active.id);
    const activeTask = tasks.find((t) => t.id === aId);
    if (!activeTask) return;

    const overId = String(over.id);
    if (overId.startsWith("drop-")) {
      const col = overId.replace("drop-", "") as TaskBoardColumn;
      if (activeTask.boardColumn === col) return;
      const destLen = tasks.filter((t) => t.boardColumn === col).length;
      let next = tasks.map((t) => (t.id === aId ? { ...t, boardColumn: col, boardOrder: destLen } : t));
      next = normalizeBoardOrders(next);
      onTasksChange(next);
      return;
    }

    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return;

    if (activeTask.boardColumn === overTask.boardColumn) {
      const col = activeTask.boardColumn;
      const ids = tasks
        .filter((t) => t.boardColumn === col)
        .sort((a, b) => a.boardOrder - b.boardOrder)
        .map((t) => t.id);
      const oldIndex = ids.indexOf(aId);
      const newIndex = ids.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const newIds = arrayMove(ids, oldIndex, newIndex);
      let next = tasks.map((t) => {
        if (t.boardColumn !== col) return t;
        const pos = newIds.indexOf(t.id);
        return pos === -1 ? t : { ...t, boardOrder: pos };
      });
      next = normalizeBoardOrders(next);
      onTasksChange(next);
      return;
    }

    const col = overTask.boardColumn;
    const colTasks = tasks
      .filter((t) => t.boardColumn === col)
      .sort((a, b) => a.boardOrder - b.boardOrder);
    const newIndex = colTasks.findIndex((t) => t.id === overId);
    if (newIndex === -1) return;
    let next = tasks.map((t) => {
      if (t.id !== aId) return t;
      return { ...t, boardColumn: col, boardOrder: newIndex };
    });
    next = normalizeBoardOrders(next);
    onTasksChange(next);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = byColumn[col];
          const ids = list.map((t) => t.id);
          return (
            <ColumnShell key={col} col={col} count={list.length}>
              <SortableContext id={col} items={ids} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2">
                  {list.map((task) => (
                    <SortableRow key={task.id} task={task} onToggleDone={onToggleDone} />
                  ))}
                </div>
              </SortableContext>
            </ColumnShell>
          );
        })}
      </div>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? (
          <div className="w-[min(100vw-2rem,320px)] sm:w-[340px]">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
