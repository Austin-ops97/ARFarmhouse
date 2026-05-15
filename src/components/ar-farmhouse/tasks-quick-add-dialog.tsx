"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TaskListSection, TaskPriority } from "@/lib/property-operations";
import { cn } from "@/lib/utils";

export type QuickAddTaskOptions = {
  title: string;
  listSection: TaskListSection;
  priority: TaskPriority;
  dueLabel: string;
};

type TasksQuickAddDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onSubmit: (options: QuickAddTaskOptions) => Promise<void>;
};

const sections: { id: TaskListSection; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "weekend", label: "Weekend prep" },
  { id: "maintenance", label: "Maintenance" },
  { id: "emergency", label: "Urgent" },
];

const priorities: { id: TaskPriority; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "emergency", label: "Emergency" },
];

export function TasksQuickAddDialog({ open, onOpenChange, busy = false, onSubmit }: TasksQuickAddDialogProps) {
  const titleId = useId();
  const [title, setTitle] = useState("");
  const [listSection, setListSection] = useState<TaskListSection>("active");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueLabel, setDueLabel] = useState("Soon");
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setTitle("");
    setListSection("active");
    setPriority("medium");
    setDueLabel("Soon");
    setError(null);
    onOpenChange(false);
  }, [onOpenChange]);

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
    <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0 bg-background/70 backdrop-blur-xl" aria-label="Close" onClick={close} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative z-10 w-full max-w-md rounded-t-[1.75rem] border border-white/12 bg-background/95 p-5 shadow-xl backdrop-blur-2xl sm:rounded-[1.75rem]"
        )}
      >
        <p id={titleId} className="font-heading text-lg font-semibold text-foreground">
          Add property task
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Shared with everyone signed in — mobile-friendly and calm.</p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          className="mt-4 rounded-xl"
          autoFocus
          disabled={busy}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Section</p>
            <select
              value={listSection}
              onChange={(e) => setListSection(e.target.value as TaskListSection)}
              className="mt-1.5 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Priority</p>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="mt-1.5 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm"
            >
              {priorities.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Due</p>
            <Input
              value={dueLabel}
              onChange={(e) => setDueLabel(e.target.value)}
              placeholder="e.g. Before Friday, This weekend"
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
            disabled={busy || !title.trim()}
            onClick={() => {
              void (async () => {
                setError(null);
                try {
                  await onSubmit({
                    title: title.trim(),
                    listSection,
                    priority,
                    dueLabel: dueLabel.trim() || "Soon",
                  });
                  close();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Could not add task.");
                }
              })();
            }}
          >
            Add task
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
