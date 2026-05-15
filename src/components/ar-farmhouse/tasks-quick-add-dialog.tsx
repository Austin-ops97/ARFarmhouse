"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TasksQuickAddDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onSubmit: (title: string) => Promise<void>;
};

export function TasksQuickAddDialog({ open, onOpenChange, busy = false, onSubmit }: TasksQuickAddDialogProps) {
  const titleId = useId();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setTitle("");
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
          Quick add task
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Saved to the shared household board for everyone signed in.</p>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          className="mt-4 rounded-xl"
          autoFocus
          disabled={busy}
        />
        {error && (
          <p className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-100/95">
            {error}
          </p>
        )}
        <motion.div className="mt-4 flex justify-end gap-2">
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
                  await onSubmit(title.trim());
                  close();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Could not add task.");
                }
              })();
            }}
          >
            Add task
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
