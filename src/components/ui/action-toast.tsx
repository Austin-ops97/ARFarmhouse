"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import type { ActionToast } from "@/hooks/use-action-toast";
import { cn } from "@/lib/utils";

export function ActionToastBanner({ toast }: { toast: ActionToast | null }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: 10 }}
          className={cn(
            "pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[80] mx-auto max-w-md rounded-2xl border px-4 py-3 text-center text-sm font-medium shadow-lg backdrop-blur-md sm:inset-x-auto sm:right-6 sm:bottom-6 sm:left-auto",
            toast.tone === "success"
              ? "border-emerald-400/30 bg-emerald-950/90 text-emerald-50"
              : "border-red-400/30 bg-red-950/90 text-red-50"
          )}
        >
          {toast.message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
