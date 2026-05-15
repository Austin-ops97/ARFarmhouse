"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckSquare, LayoutGrid, List, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { TasksQuickAddDialog } from "@/components/ar-farmhouse/tasks-quick-add-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskCard } from "@/components/ar-farmhouse/task-card";
import { TasksBoard } from "@/components/ar-farmhouse/tasks-board";
import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { useAuth } from "@/contexts/auth-context";
import { usePropertyData } from "@/contexts/property-data-context";
import { getWeekendHubBundle } from "@/lib/weekend-hub-bundle";
import type { HouseTask, TaskListSection } from "@/lib/property-operations";
import { createHouseTask, persistHouseTasksBatch, updateHouseTask } from "@/services/property-data";
import { cn } from "@/lib/utils";

const surface = cn("ar-surface-raised relative overflow-hidden rounded-[1.35rem]");

const sectionLabel: Record<TaskListSection, string> = {
  active: "Active tasks",
  maintenance: "Upcoming maintenance",
  completed: "Recently completed",
  weekend: "Weekend prep",
  emergency: "Needs attention",
};

const sectionOrder: TaskListSection[] = ["emergency", "active", "maintenance", "weekend", "completed"];

export function TasksView() {
  const reduceMotion = useReducedMotion();
  const { openWeekendHub } = useEcosystem();
  const { user, displayName, avatarUrl, configured } = useAuth();
  const { tasks, tasksLoading, tasksError } = usePropertyData();
  const [view, setView] = useState<"list" | "board">("list");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddBusy, setQuickAddBusy] = useState(false);
  const [localTasks, setLocalTasks] = useState<HouseTask[] | null>(null);

  const displayTasks = localTasks ?? tasks;

  const toggleDone = useCallback(
    async (id: string) => {
      const task = displayTasks.find((t) => t.id === id);
      if (!task) return;
      const nextDone = !task.done;
      const patch: Partial<HouseTask> = nextDone
        ? { done: true, listSection: "completed", boardColumn: "done" }
        : { done: false, listSection: "active", boardColumn: "todo" };
      setLocalTasks((prev) => {
        const base = prev ?? tasks;
        return base.map((t) => (t.id === id ? { ...t, ...patch } : t));
      });
      try {
        await updateHouseTask(id, patch);
        setLocalTasks(null);
      } catch {
        setLocalTasks(null);
      }
    },
    [displayTasks, tasks]
  );

  const handleTasksChange = useCallback(
    async (next: HouseTask[]) => {
      setLocalTasks(next);
      try {
        await persistHouseTasksBatch(next);
        setLocalTasks(null);
      } catch {
        setLocalTasks(null);
      }
    },
    []
  );

  const handleQuickAdd = useCallback(
    async (title: string) => {
      if (!user) throw new Error("Sign in to add tasks.");
      setQuickAddBusy(true);
      try {
        await createHouseTask({
          title,
          uid: user.uid,
          displayName,
          avatarUrl,
        });
      } finally {
        setQuickAddBusy(false);
      }
    },
    [avatarUrl, displayName, user]
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

  const hubBundle = useMemo(() => getWeekendHubBundle("current"), []);
  const weekendTasksPreview = useMemo(() => displayTasks.filter((t) => t.listSection === "weekend").slice(0, 4), [displayTasks]);

  const quickAddDisabled = !configured || !user;

  return (
    <motion.div className="space-y-6">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(surface, "space-y-3 p-4 sm:p-5")}
      >
        <motion.div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-primary/90">Ecosystem</p>
            <p className="font-heading text-lg font-semibold tracking-tight text-foreground">Before arrivals · {hubBundle.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Prep tasks are mirrored from the weekend hub — same story as Calendar and Feed.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-xl" onClick={() => openWeekendHub("current")}>
            Weekend hub
          </Button>
        </motion.div>
        <ul className="space-y-2">
          {weekendTasksPreview.length === 0 && hubBundle.tasksBeforeArrival.length === 0 ? (
            <li className="ar-nested-well rounded-xl px-3 py-3 text-sm text-muted-foreground">
              No weekend prep tasks yet. They will mirror the hub when stays are on the calendar.
            </li>
          ) : (
            <>
              {weekendTasksPreview.map((t) => (
                <li key={t.id} className="ar-nested-well flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm">
                  <span className="text-foreground/90">{t.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{t.dueLabel}</span>
                </li>
              ))}
              {hubBundle.tasksBeforeArrival.slice(0, 2).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-primary/15 bg-primary/[0.06] px-3 py-2 text-sm"
                >
                  <span className="text-foreground/90">{t.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{t.dueLabel}</span>
                </li>
              ))}
            </>
          )}
        </ul>
        {hubBundle.packing.length > 0 ? (
          <p className="text-[11px] text-muted-foreground/85">Things to bring: {hubBundle.packing.slice(0, 2).join(" · ")}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground/85">Packing nudges from the weekend hub will appear here.</p>
        )}
      </motion.section>

      {tasksError && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/95">
          Tasks could not sync: {tasksError}
        </p>
      )}

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
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={quickAddDisabled}
            title={quickAddDisabled ? "Sign in to add tasks" : undefined}
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="size-4" />
            Quick add
          </Button>
        </div>
      </motion.section>

      {tasksLoading ? (
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
                  <p className="font-heading text-lg font-semibold text-foreground">No shared tasks yet</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Tap Quick add to create the first household job — everyone signed in will see it live.
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
                            <TaskCard task={task} onToggleDone={(id) => void toggleDone(id)} />
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
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <motion.button
        type="button"
        disabled={quickAddDisabled}
        onClick={() => setQuickAddOpen(true)}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        className={cn(
          "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-30 flex size-14 items-center justify-center rounded-full border border-white/12 sm:right-4",
          "bg-primary text-primary-foreground shadow-[0_18px_50px_-18px_rgba(0,0,0,0.75)] lg:hidden",
          quickAddDisabled && "pointer-events-none opacity-50"
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
    </motion.div>
  );
}
