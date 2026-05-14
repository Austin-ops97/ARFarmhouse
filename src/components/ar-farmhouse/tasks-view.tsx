"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckSquare, LayoutGrid, List, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskCard } from "@/components/ar-farmhouse/task-card";
import { TasksBoard } from "@/components/ar-farmhouse/tasks-board";
import {
  initialDemoTasks,
  type DemoTask,
  type TaskListSection,
} from "@/lib/operations-demo";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

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
  const [tasks, setTasks] = useState<DemoTask[]>(initialDemoTasks);
  const [view, setView] = useState<"list" | "board">("list");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), reduceMotion ? 100 : 500);
    return () => window.clearTimeout(t);
  }, [reduceMotion]);

  const toggleDone = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextDone = !t.done;
        if (nextDone) {
          const doneCount = prev.filter((x) => x.boardColumn === "done").length;
          return {
            ...t,
            done: true,
            listSection: "completed" as const,
            boardColumn: "done" as const,
            boardOrder: doneCount,
          };
        }
        return {
          ...t,
          done: false,
          listSection: "active" as const,
          boardColumn: "todo" as const,
          boardOrder: prev.filter((x) => x.boardColumn === "todo" && !x.done).length,
        };
      })
    );
  }, []);

  const grouped = useMemo(() => {
    const g: Record<TaskListSection, DemoTask[]> = {
      active: [],
      maintenance: [],
      completed: [],
      weekend: [],
      emergency: [],
    };
    for (const t of tasks) {
      g[t.listSection].push(t);
    }
    for (const k of Object.keys(g) as TaskListSection[]) {
      g[k].sort((a, b) => a.boardOrder - b.boardOrder);
    }
    return g;
  }, [tasks]);

  return (
    <div className="space-y-6">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(surface, "flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6")}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
            <CheckSquare className="size-5 text-primary" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Tasks</h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Shared rhythm — clear owners, soft deadlines, nothing that feels like a ticket queue.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                view === "list" ? "bg-white/[0.1] text-foreground" : "text-muted-foreground hover:text-foreground"
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
                view === "board" ? "bg-white/[0.1] text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-4" aria-hidden />
              Board
            </button>
          </div>
          <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled>
            <Plus className="size-4" />
            Quick add
          </Button>
        </div>
      </motion.section>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn(surface, "ar-skeleton-shimmer space-y-3 p-4")}>
              <Skeleton className="h-4 w-40 rounded-full bg-white/[0.08]" />
              <Skeleton className="h-24 w-full rounded-2xl bg-white/[0.06]" />
              <Skeleton className="h-24 w-full rounded-2xl bg-white/[0.06]" />
            </div>
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
              {sectionOrder.map((sec) => {
                const list = grouped[sec];
                if (list.length === 0) return null;
                return (
                  <section key={sec} className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-sm font-semibold tracking-tight text-foreground">{sectionLabel[sec]}</h3>
                      <span className="text-[11px] text-muted-foreground">{list.length}</span>
                    </div>
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
                          <TaskCard task={task} onToggleDone={toggleDone} />
                        </motion.div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="board"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="overflow-x-auto pb-2"
            >
              <div className="min-w-[720px] md:min-w-0">
                <TasksBoard tasks={tasks} onTasksChange={setTasks} onToggleDone={toggleDone} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <motion.button
        type="button"
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        className={cn(
          "fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex size-14 items-center justify-center rounded-full border border-white/12",
          "bg-primary text-primary-foreground shadow-[0_18px_50px_-18px_rgba(0,0,0,0.75)] lg:hidden"
        )}
        aria-label="Quick add task"
      >
        <Plus className="size-6" />
      </motion.button>
    </div>
  );
}
