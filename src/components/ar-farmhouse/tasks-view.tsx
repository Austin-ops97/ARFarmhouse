"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckSquare, LayoutGrid, List, Plus, Repeat } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RoutineCard } from "@/components/ar-farmhouse/routine-card";
import { RoutineFormDialog, type RoutineFormValues } from "@/components/ar-farmhouse/routine-form-dialog";
import { TasksQuickAddDialog, type QuickAddTaskOptions } from "@/components/ar-farmhouse/tasks-quick-add-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskCard } from "@/components/ar-farmhouse/task-card";
import { TasksBoard } from "@/components/ar-farmhouse/tasks-board";
import { useAuth } from "@/contexts/auth-context";
import { usePropertyData } from "@/contexts/property-data-context";
import { useTaskPendingDelete } from "@/hooks/use-task-pending-delete";
import type { HouseRoutine, HouseTask, TaskListSection } from "@/lib/property-operations";
import { SyncStatusBanner } from "@/components/ar-farmhouse/sync-status-banner";
import {
  completeHouseTaskWithCooldown,
  createHouseTask,
  deleteHouseTask,
  persistHouseTasksBatch,
  undoHouseTaskCompletion,
  updateHouseTask,
} from "@/services/property-data";
import {
  createHouseRoutine,
  deleteHouseRoutine,
  subscribeHouseRoutines,
  tryGenerateDueRoutineTasks,
  updateHouseRoutine,
} from "@/services/routines";
import { TASK_DELETE_COOLDOWN_MS } from "@/lib/task-constants";
import { cn } from "@/lib/utils";

const surface = cn("ar-surface-raised relative overflow-hidden rounded-[1.35rem]");

const sectionLabel: Record<TaskListSection, string> = {
  active: "Active tasks",
  maintenance: "Upcoming maintenance",
  completed: "Recently completed",
  weekend: "Weekend prep",
  emergency: "Needs attention",
};

const sectionOrder: TaskListSection[] = ["emergency", "active", "maintenance", "completed"];

export function TasksView() {
  const reduceMotion = useReducedMotion();
  const { user, displayName, configured } = useAuth();
  const { tasks, tasksLoading, tasksError } = usePropertyData();
  const [mainTab, setMainTab] = useState<"tasks" | "routines">("tasks");
  const [view, setView] = useState<"list" | "board">("list");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddBusy, setQuickAddBusy] = useState(false);
  const [localTasks, setLocalTasks] = useState<HouseTask[] | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [routines, setRoutines] = useState<HouseRoutine[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(true);
  const [routinesError, setRoutinesError] = useState<string | null>(null);
  const [routineFormOpen, setRoutineFormOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<HouseRoutine | null>(null);
  const [routineBusy, setRoutineBusy] = useState(false);

  const displayTasks = localTasks ?? tasks;
  const { countdownById, isPendingDelete } = useTaskPendingDelete(displayTasks);

  useEffect(() => {
    return subscribeHouseRoutines(
      (rows) => {
        setRoutines(rows);
        setRoutinesLoading(false);
        setRoutinesError(null);
      },
      (e) => {
        setRoutinesError(e.message);
        setRoutinesLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (!configured || !user) return;
    void tryGenerateDueRoutineTasks();
  }, [configured, user, routines.length]);

  const toggleDone = useCallback(
    async (id: string) => {
      const task = displayTasks.find((t) => t.id === id);
      if (!task) return;

      if (isPendingDelete(id) || (typeof task.deleteScheduledAt === "number" && task.deleteScheduledAt > Date.now())) {
        setLocalTasks((prev) => {
          const base = prev ?? tasks;
          return base.map((t) =>
            t.id === id
              ? { ...t, done: false, listSection: "active", boardColumn: "todo", deleteScheduledAt: null }
              : t
          );
        });
        try {
          await undoHouseTaskCompletion(id);
          setLocalTasks(null);
          setMutationError(null);
        } catch (e) {
          setLocalTasks(null);
          setMutationError(e instanceof Error ? e.message : "Could not undo.");
        }
        return;
      }

      if (!task.done) {
        const deleteAt = Date.now() + TASK_DELETE_COOLDOWN_MS;
        setLocalTasks((prev) => {
          const base = prev ?? tasks;
          return base.map((t) =>
            t.id === id
              ? { ...t, done: true, listSection: "completed", boardColumn: "done", deleteScheduledAt: deleteAt }
              : t
          );
        });
        try {
          await completeHouseTaskWithCooldown(id);
          setLocalTasks(null);
          setMutationError(null);
        } catch (e) {
          setLocalTasks(null);
          setMutationError(e instanceof Error ? e.message : "Could not complete task.");
        }
        return;
      }

      const patch: Partial<HouseTask> = { done: false, listSection: "active", boardColumn: "todo" };
      setLocalTasks((prev) => {
        const base = prev ?? tasks;
        return base.map((t) => (t.id === id ? { ...t, ...patch } : t));
      });
      try {
        await updateHouseTask(id, patch);
        setLocalTasks(null);
        setMutationError(null);
      } catch (e) {
        setLocalTasks(null);
        setMutationError(e instanceof Error ? e.message : "Could not update task.");
      }
    },
    [displayTasks, isPendingDelete, tasks]
  );

  const handleDeleteTask = useCallback(
    async (id: string) => {
      if (!window.confirm("Delete this task permanently?")) return;
      try {
        await deleteHouseTask(id);
        setMutationError(null);
      } catch (e) {
        setMutationError(e instanceof Error ? e.message : "Could not delete task.");
      }
    },
    []
  );

  const handleTasksChange = useCallback(
    async (next: HouseTask[]) => {
      setLocalTasks(next);
      try {
        await persistHouseTasksBatch(next);
        setLocalTasks(null);
        setMutationError(null);
      } catch (e) {
        setLocalTasks(null);
        setMutationError(e instanceof Error ? e.message : "Could not save task order.");
      }
    },
    []
  );

  const handleQuickAdd = useCallback(
    async (opts: QuickAddTaskOptions) => {
      if (!user) throw new Error("Sign in to add tasks.");
      setQuickAddBusy(true);
      try {
        await createHouseTask({
          title: opts.title,
          uid: user.uid,
          displayName,
          avatarUrl: null,
          listSection: opts.listSection,
          priority: opts.priority,
          dueLabel: opts.dueLabel,
        });
      } finally {
        setQuickAddBusy(false);
      }
    },
    [displayName, user]
  );

  const grouped = useMemo(() => {
    const g: Record<TaskListSection, HouseTask[]> = {
      active: [],
      maintenance: [],
      completed: [],
      weekend: [],
      emergency: [],
    };
    for (const t of displayTasks) {
      g[t.listSection].push(t);
    }
    for (const k of Object.keys(g) as TaskListSection[]) {
      g[k].sort((a, b) => a.boardOrder - b.boardOrder);
    }
    return g;
  }, [displayTasks]);

  const quickAddDisabled = !configured || !user;

  const handleRoutineSubmit = useCallback(
    async (values: RoutineFormValues) => {
      if (!user) throw new Error("Sign in to save routines.");
      setRoutineBusy(true);
      try {
        const startDate = new Date(`${values.startDate}T12:00:00`);
        if (editingRoutine) {
          await updateHouseRoutine(editingRoutine.id, {
            title: values.title,
            description: values.description,
            intervalValue: values.intervalValue,
            intervalUnit: values.intervalUnit,
            startDate,
            priority: values.priority,
            category: values.category,
          });
        } else {
          await createHouseRoutine({
            title: values.title,
            description: values.description,
            intervalValue: values.intervalValue,
            intervalUnit: values.intervalUnit,
            startDate,
            uid: user.uid,
            displayName,
            avatarUrl: null,
            priority: values.priority,
            category: values.category,
          });
        }
        await tryGenerateDueRoutineTasks();
      } finally {
        setRoutineBusy(false);
      }
    },
    [displayName, editingRoutine, user]
  );

  return (
    <motion.div className="space-y-6">

      <SyncStatusBanner error={mutationError ?? tasksError ?? routinesError} />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(surface, "flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6")}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/55 bg-muted/50 dark:border-white/10 dark:bg-white/[0.05]">
            <CheckSquare className="size-5 text-primary" aria-hidden />
          </span>
          <motion.div className="min-w-0 space-y-1">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Tasks</h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Shared rhythm — clear owners, soft deadlines, nothing that feels like a ticket queue.
            </p>
          </motion.div>
        </div>
        <motion.div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-border/55 bg-muted/40 p-1 dark:border-white/10 dark:bg-white/[0.04]">
            <button
              type="button"
              onClick={() => setMainTab("tasks")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                mainTab === "tasks"
                  ? "bg-card text-foreground shadow-sm dark:bg-white/[0.1]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tasks
            </button>
            <button
              type="button"
              onClick={() => setMainTab("routines")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                mainTab === "routines"
                  ? "bg-card text-foreground shadow-sm dark:bg-white/[0.1]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Repeat className="size-3.5" aria-hidden />
              Routines
            </button>
          </div>
          {mainTab === "tasks" ? (
            <div className="flex rounded-2xl border border-border/55 bg-muted/40 p-1 dark:border-white/10 dark:bg-white/[0.04]">
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                  view === "list"
                    ? "bg-card text-foreground shadow-sm dark:bg-white/[0.1]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="size-4" aria-hidden />
                List
              </button>
              <button
                type="button"
                onClick={() => setView("board")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                  view === "board"
                    ? "bg-card text-foreground shadow-sm dark:bg-white/[0.1]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="size-4" aria-hidden />
                Board
              </button>
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={quickAddDisabled}
            title={quickAddDisabled ? "Sign in to add tasks" : undefined}
            onClick={() => {
              if (mainTab === "routines") {
                setEditingRoutine(null);
                setRoutineFormOpen(true);
              } else {
                setQuickAddOpen(true);
              }
            }}
          >
            <Plus className="size-4" />
            {mainTab === "routines" ? "Add routine" : "Quick add"}
          </Button>
        </motion.div>
      </motion.section>

      {mainTab === "routines" ? (
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {routinesLoading ? (
            <motion.div className={cn(surface, "space-y-3 p-4")}>
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </motion.div>
          ) : routines.length === 0 ? (
            <div className={cn(surface, "px-6 py-12 text-center")}>
              <p className="font-heading text-lg font-semibold text-foreground">No routines yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a routine for filters, inspections, or seasonal upkeep — tasks appear automatically when due.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {routines.map((routine) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  busy={routineBusy}
                  onEdit={(r) => {
                    setEditingRoutine(r);
                    setRoutineFormOpen(true);
                  }}
                  onToggleActive={(r) => {
                    void (async () => {
                      setRoutineBusy(true);
                      try {
                        await updateHouseRoutine(r.id, { isActive: !r.isActive });
                        if (!r.isActive) await tryGenerateDueRoutineTasks();
                      } catch (e) {
                        setMutationError(e instanceof Error ? e.message : "Could not update routine.");
                      } finally {
                        setRoutineBusy(false);
                      }
                    })();
                  }}
                  onDelete={(r) => {
                    if (!window.confirm(`Delete routine "${r.title}"? Existing tasks will stay.`)) return;
                    void (async () => {
                      setRoutineBusy(true);
                      try {
                        await deleteHouseRoutine(r.id);
                      } catch (e) {
                        setMutationError(e instanceof Error ? e.message : "Could not delete routine.");
                      } finally {
                        setRoutineBusy(false);
                      }
                    })();
                  }}
                />
              ))}
            </div>
          )}
        </motion.section>
      ) : tasksLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.div key={i} className={cn(surface, "ar-skeleton-shimmer space-y-3 p-4")}>
              <Skeleton className="h-4 w-40 rounded-full bg-muted/80 dark:bg-white/[0.08]" />
              <Skeleton className="h-24 w-full rounded-2xl bg-muted/70 dark:bg-white/[0.06]" />
              <Skeleton className="h-24 w-full rounded-2xl bg-muted/70 dark:bg-white/[0.06]" />
            </motion.div>
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {view === "list" ? (
            <motion.div
              key="list"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {displayTasks.length === 0 ? (
                <div className={cn(surface, "px-6 py-12 text-center")}>
                  <p className="font-heading text-lg font-semibold text-foreground">Upcoming maintenance tasks will appear here</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Tap Quick add for trip prep, cleanup, or property upkeep — everyone signed in sees updates live.
                  </p>
                </div>
              ) : (
                sectionOrder.map((sec) => {
                  const list = grouped[sec];
                  if (list.length === 0) return null;
                  return (
                    <section key={sec} className="space-y-3">
                      <motion.div className="flex items-center justify-between px-1">
                        <h3 className="text-sm font-semibold tracking-tight text-foreground">{sectionLabel[sec]}</h3>
                        <span className="text-[11px] text-muted-foreground">{list.length}</span>
                      </motion.div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {list.map((task) => (
                          <motion.div
                            key={task.id}
                            layout
                            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-5%" }}
                            whileHover={reduceMotion ? undefined : { y: -2 }}
                            transition={{ duration: 0.35 }}
                          >
                            <TaskCard
                              task={task}
                              pendingDeleteSeconds={countdownById[task.id]}
                              onToggleDone={(id) => void toggleDone(id)}
                              onDelete={(id) => void handleDeleteTask(id)}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  );
                })
              )}
            </motion.div>
          ) : (
            <motion.div
              key="board"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="min-w-0 pb-2"
            >
              <TasksBoard
                tasks={displayTasks}
                onTasksChange={(next) => void handleTasksChange(next)}
                onToggleDone={(id) => void toggleDone(id)}
                onDelete={(id) => void handleDeleteTask(id)}
                countdownById={countdownById}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <motion.button
        type="button"
        disabled={quickAddDisabled}
        onClick={() => {
          if (mainTab === "routines") {
            setEditingRoutine(null);
            setRoutineFormOpen(true);
          } else {
            setQuickAddOpen(true);
          }
        }}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        className={cn(
          "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-30 flex size-14 items-center justify-center rounded-full border border-white/12 sm:right-4",
          "bg-primary text-primary-foreground shadow-[0_18px_50px_-18px_rgba(0,0,0,0.75)] lg:hidden",
          quickAddDisabled && "pointer-events-none opacity-50",
          mainTab === "routines" && "hidden"
        )}
        aria-label="Quick add task"
      >
        <Plus className="size-6" />
      </motion.button>

      <TasksQuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        busy={quickAddBusy}
        onSubmit={handleQuickAdd}
      />

      <RoutineFormDialog
        open={routineFormOpen}
        onOpenChange={(open) => {
          setRoutineFormOpen(open);
          if (!open) setEditingRoutine(null);
        }}
        busy={routineBusy}
        initial={editingRoutine}
        onSubmit={handleRoutineSubmit}
      />
    </motion.div>
  );
}
