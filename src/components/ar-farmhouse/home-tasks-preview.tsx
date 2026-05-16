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
  "h-full rounded-[1.125rem] border border-border/38 bg-card/62 p-4 shadow-[var(--ar-float-subtle)] backdrop-blur-[1px] dark:border-white/[0.055] dark:bg-white/[0.025] dark:shadow-[var(--ar-float-subtle)] sm:rounded-xl sm:p-[1.05rem] md:p-[1.05rem]";

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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/75 sm:text-[11px] sm:tracking-[0.21em]">
            Tasks
          </p>
          <h2 className="mt-1 font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Active work
          </h2>
        </div>
        <button
          type="button"
          onClick={() => goTo("tasks")}
          className="group inline-flex min-h-10 items-center gap-1.5 px-1 text-sm font-medium text-primary sm:min-h-0 sm:text-xs"
        >
          All tasks
          <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {loading && (
        <ul className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <Skeleton className="h-14 w-full rounded-xl" />
            </li>
          ))}
        </ul>
      )}

      {!loading && error && (
        <p className="mt-4 text-[13px] leading-snug text-muted-foreground">Tasks could not sync. Open Tasks to retry.</p>
      )}

      {!loading && !error && top.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border/45 bg-muted/15 px-3 py-5 text-center dark:border-white/[0.07] dark:bg-white/[0.02]">
          <CheckSquare className="mx-auto size-8 text-muted-foreground/50" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">Nothing on the board</p>
          <p className="mt-1 text-xs text-muted-foreground">Add tasks from the Tasks tab when something needs doing.</p>
        </div>
      )}

      {!loading && top.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {top.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => goTo("tasks")}
                className="flex min-h-11 w-full items-start gap-2.5 rounded-lg border border-border/35 bg-muted/18 px-3 py-2.5 text-left transition hover:border-border/55 hover:bg-muted/30 dark:border-white/[0.05] dark:bg-white/[0.02] dark:hover:bg-white/[0.045]"
              >
                <span
                  className={cn("mt-1 size-2 shrink-0 rounded-full bg-current", priorityTone[task.priority])}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium text-foreground">{task.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-[11px]">
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
