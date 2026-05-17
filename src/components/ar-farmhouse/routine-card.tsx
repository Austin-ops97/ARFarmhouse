"use client";

import { CalendarClock, MoreHorizontal, Pencil, Pause, Play, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { HouseRoutine } from "@/lib/property-operations";
import { formatRoutineSchedule } from "@/lib/routine-schedule";
import { cn } from "@/lib/utils";

export type RoutineCardProps = {
  routine: HouseRoutine;
  busy?: boolean;
  onEdit: (routine: HouseRoutine) => void;
  onToggleActive: (routine: HouseRoutine) => void;
  onDelete: (routine: HouseRoutine) => void;
};

export function RoutineCard({ routine, busy, onEdit, onToggleActive, onDelete }: RoutineCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nextLabel = new Date(routine.nextRunAtMs).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article
      className={cn(
        "relative rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_18px_50px_-32px_rgba(0,0,0,0.72)] backdrop-blur-xl",
        !routine.isActive && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="text-sm font-semibold leading-snug text-foreground">{routine.title}</h4>
          <p className="text-xs text-muted-foreground">
            {formatRoutineSchedule(routine.intervalValue, routine.intervalUnit)}
          </p>
          {routine.description ? (
            <p className="line-clamp-2 text-xs text-muted-foreground/90">{routine.description}</p>
          ) : null}
        </div>
        <div className="relative shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 rounded-xl"
            aria-label="Routine actions"
            disabled={busy}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MoreHorizontal className="size-4" />
          </Button>
          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[10.5rem] rounded-xl border border-white/12 bg-card p-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted/80"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(routine);
                  }}
                >
                  <Pencil className="size-4" />
                  Edit
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted/80"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleActive(routine);
                  }}
                >
                  {routine.isActive ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {routine.isActive ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-300 hover:bg-red-500/10"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(routine);
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-muted-foreground">
          <CalendarClock className="size-3" aria-hidden />
          Next: {nextLabel}
        </span>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 font-medium",
            routine.isActive
              ? "border border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
              : "border border-white/10 bg-white/[0.04] text-muted-foreground"
          )}
        >
          {routine.isActive ? "Active" : "Paused"}
        </span>
      </div>
    </article>
  );
}
