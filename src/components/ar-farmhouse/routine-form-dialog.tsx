"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { OverlayPortal } from "@/components/ar-farmhouse/overlay-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import type { HouseRoutine, RoutineIntervalUnit, TaskPriority } from "@/lib/property-operations";
import { AR_MOBILE_SHEET, AR_OVERLAY_HOST, AR_OVERLAY_SCRIM } from "@/lib/mobile-overlay";
import { cn } from "@/lib/utils";

export type RoutineFormValues = {
  title: string;
  description: string;
  intervalValue: number;
  intervalUnit: RoutineIntervalUnit;
  startDate: string;
  priority: TaskPriority;
  category: string;
};

const UNITS: { id: RoutineIntervalUnit; label: string }[] = [
  { id: "days", label: "Days" },
  { id: "weeks", label: "Weeks" },
  { id: "months", label: "Months" },
  { id: "quarterly", label: "Quarterly (3 mo)" },
  { id: "years", label: "Years" },
];

const priorities: { id: TaskPriority; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "emergency", label: "Emergency" },
];

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type RoutineFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  initial?: HouseRoutine | null;
  onSubmit: (values: RoutineFormValues) => Promise<void>;
};

export function RoutineFormDialog({ open, onOpenChange, busy = false, initial, onSubmit }: RoutineFormDialogProps) {
  const titleId = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [intervalValue, setIntervalValue] = useState("1");
  const [intervalUnit, setIntervalUnit] = useState<RoutineIntervalUnit>("months");
  const [startDate, setStartDate] = useState(() => toDateInputValue(new Date()));
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description);
      setIntervalValue(String(initial.intervalValue));
      setIntervalUnit(initial.intervalUnit);
      setStartDate(toDateInputValue(new Date(initial.startDateMs)));
      setPriority(initial.priority);
      setCategory(initial.category);
    } else {
      setTitle("");
      setDescription("");
      setIntervalValue("1");
      setIntervalUnit("months");
      setStartDate(toDateInputValue(new Date()));
      setPriority("medium");
      setCategory("");
    }
    setError(null);
  }, [open, initial]);

  const valid = useMemo(() => {
    const n = Number.parseInt(intervalValue, 10);
    return title.trim().length > 0 && Number.isFinite(n) && n > 0 && startDate.length > 0;
  }, [title, intervalValue, startDate]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <OverlayPortal>
      <div className={cn(AR_OVERLAY_HOST, "z-[65]")}>
        <button type="button" className={AR_OVERLAY_SCRIM} aria-label="Close" onClick={close} />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            AR_MOBILE_SHEET,
            "relative z-10 max-w-md overflow-y-auto overscroll-contain p-5 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
          )}
        >
          <p id={titleId} className="font-heading text-lg font-semibold text-foreground">
            {initial ? "Edit routine" : "New routine"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Repeatable tasks are created automatically on schedule.
          </p>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Routine title"
            className="mt-4 rounded-xl"
            autoFocus
            disabled={busy}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            disabled={busy}
            className="mt-3 w-full resize-none rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm"
          />

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Repeat every</p>
              <Input
                type="number"
                min={1}
                inputMode="numeric"
                value={intervalValue}
                onChange={(e) => setIntervalValue(e.target.value)}
                className="mt-1.5 rounded-xl"
                disabled={busy}
              />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Unit</p>
              <select
                value={intervalUnit}
                onChange={(e) => setIntervalUnit(e.target.value as RoutineIntervalUnit)}
                className="mt-1.5 w-full min-w-[8.5rem] rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm"
                disabled={busy}
              >
                {UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Start date</p>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1.5 rounded-xl"
              disabled={busy}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Priority</p>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="mt-1.5 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm"
                disabled={busy}
              >
                {priorities.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Category</p>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. maintenance"
                className="mt-1.5 rounded-xl"
                disabled={busy}
              />
            </div>
          </div>

          {error ? (
            <p className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-100/95">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={busy || !valid}
              onClick={() => {
                void (async () => {
                  setError(null);
                  const n = Number.parseInt(intervalValue, 10);
                  try {
                    await onSubmit({
                      title: title.trim(),
                      description: description.trim(),
                      intervalValue: n,
                      intervalUnit,
                      startDate,
                      priority,
                      category: category.trim(),
                    });
                    close();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Could not save routine.");
                  }
                })();
              }}
            >
              {initial ? "Save changes" : "Create routine"}
            </Button>
          </div>
        </motion.div>
      </div>
    </OverlayPortal>
  );
}
