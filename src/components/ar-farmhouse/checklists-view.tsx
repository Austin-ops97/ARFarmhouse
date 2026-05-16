"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import { ChecklistHistoryView } from "@/components/ar-farmhouse/checklist-history-view";
import { ChecklistLastManOutForm } from "@/components/ar-farmhouse/checklist-last-man-out-form";
import {
  ChecklistSegmentSwitcher,
  type ChecklistSegment,
} from "@/components/ar-farmhouse/checklist-segment-switcher";
import { useAuth } from "@/contexts/auth-context";

export function ChecklistsView() {
  const reduceMotion = useReducedMotion();
  const { user, displayName } = useAuth();
  const [segment, setSegment] = useState<ChecklistSegment>("active");

  const viewTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.5 };

  return (
    <div className="mx-auto max-w-xl pb-[max(5rem,env(safe-area-inset-bottom))]">
      <header className="mb-5 px-0.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Checklists
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Property walkthrough and shutdown confirmation.
        </p>
      </header>

      <ChecklistSegmentSwitcher value={segment} onChange={setSegment} className="mb-6" />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={segment}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={viewTransition}
        >
          {segment === "active" ? (
            user ? (
              <ChecklistLastManOutForm
                userId={user.uid}
                displayName={displayName}
                onSubmitted={() => setSegment("history")}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Sign in to submit a checklist.</p>
            )
          ) : (
            <ChecklistHistoryView />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
