"use client";

import { ArrowUpRight, CheckSquare } from "lucide-react";
import { useMemo } from "react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomeTasks } from "@/hooks/use-home-tasks";
import { pickTopHomeTasks } from "@/lib/home-tasks";
import type { TaskPriority } from "@/lib/property-operations";
import { cn } from "@/lib/utils";

const surface =
  "h-full rounded-[1.25rem] border border-border/50 bg-card/80 p-5 shadow-[var(--ar-float-elevate)] dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-6";

const priorityLabel: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  emergency: "Urgent",
};

const priorityTone: Record<TaskPriority, string> = {
  low: "text-emerald-400/90",
  medium: "text-amber-300/90",
  high: "text-orange-400/90",
  emergency: "text-rose-400",
};

export function HomeTasksPreview() {
  const { goTo } = useEcosystem();
  const { tasks, loading, error } = useHomeTasks();
  const top = useMemo(() => pickTopHomeTasks(tasks, 3), [tasks]);

  return (
    <section className={cn(surface)} aria-label="Active tasks">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">Tasks</p>
          <h2 className="mt-1.5 font-heading text-lg font-semibold tracking-tight text-foreground">Active work</h2>
        </div>
        <button
          type="button"
          onClick={() => goTo("tasks")}
          className="group inline-flex items-center gap-1 text-xs font-medium text-primary"
        >
          All tasks
          <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {loading && (
        <ul className="mt-5 space-y-2.5">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton className="h-14 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      )}

      {!loading && error && (
        <p className="mt-5 text-sm text-muted-foreground">Tasks could not sync. Open Tasks to retry.</p>
      )}

      {!loading && !error && top.length === 0 && (
        <div className="mt-5 rounded-xl border border-dashed border-border/50 bg-muted/20 px-4 py-6 text-center dark:border-white/[0.08] dark:bg-white/[0.02]">
          <CheckSquare className="mx-auto size-8 text-muted-foreground/50" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">Nothing on the board</p>
          <p className="mt-1 text-xs text-muted-foreground">Add tasks from the Tasks tab when something needs doing.</p>
        </div>
      )}

      {!loading && top.length > 0 && (
        <ul className="mt-5 space-y-2">
          {top.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => goTo("tasks")}
                className="flex w-full items-start gap-3 rounded-xl border border-border/40 bg-muted/25 px-3.5 py-3 text-left transition hover:border-border/70 hover:bg-muted/40 dark:border-white/[0.06] dark:bg-white/[0.025] dark:hover:bg-white/[0.05]"
              >
                <span
                  className={cn("mt-1 size-2 shrink-0 rounded-full bg-current", priorityTone[task.priority])}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium text-foreground">{task.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className={priorityTone[task.priority]}>{priorityLabel[task.priority]}</span>
                    {task.dueLabel ? <span>· {task.dueLabel}</span> : null}
                    <span>· {task.assignee.name}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
