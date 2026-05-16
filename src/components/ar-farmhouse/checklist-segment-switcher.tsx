"use client";

import { LayoutGroup, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export type ChecklistSegment = "active" | "history";

const segments: { id: ChecklistSegment; label: string }[] = [
  { id: "active", label: "Last Man Out" },
  { id: "history", label: "Previously Submitted" },
];

type ChecklistSegmentSwitcherProps = {
  value: ChecklistSegment;
  onChange: (segment: ChecklistSegment) => void;
  className?: string;
};

export function ChecklistSegmentSwitcher({ value, onChange, className }: ChecklistSegmentSwitcherProps) {
  const reduceMotion = useReducedMotion();
  const segTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 520, damping: 38, mass: 0.35 };

  return (
    <LayoutGroup id="checklists-segments">
      <motion.div
        layout
        className={cn(
          "grid grid-cols-2 gap-0 rounded-2xl border border-border/55 bg-muted/40 p-1 dark:border-white/10 dark:bg-black/25",
          className
        )}
        role="tablist"
        aria-label="Checklist views"
      >
        {segments.map(({ id, label }) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(id)}
              className={cn(
                "relative z-0 rounded-[0.65rem] py-2.5 text-sm font-semibold transition-colors duration-150",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground/85"
              )}
            >
              {active ? (
                <motion.span
                  layoutId="checklists-segment-pill"
                  className="absolute inset-0 rounded-[0.65rem] border border-border/50 bg-card shadow-[var(--ar-float-subtle)] dark:border-white/12 dark:bg-white/[0.08]"
                  transition={segTransition}
                />
              ) : null}
              <span className="relative z-10 px-1">{label}</span>
            </button>
          );
        })}
      </motion.div>
    </LayoutGroup>
  );
}
