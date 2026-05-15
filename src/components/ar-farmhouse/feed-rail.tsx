"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Camera, Heart, Home, Sparkles, Sun } from "lucide-react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { cn } from "@/lib/utils";

const railCard = cn("ar-surface-raised rounded-2xl p-4");

export function FeedRail() {
  const reduceMotion = useReducedMotion();
  const { openWeekendHub } = useEcosystem();

  return (
    <div
      className="sticky top-[calc(var(--ar-header-height)+0.75rem)] space-y-4"
      role="complementary"
      aria-label="At a glance"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={railCard}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium text-primary/90">
          <Heart className="size-3.5" aria-hidden />
          <span>Shared memories</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The feed is your family&apos;s quiet living room wall — new posts, reactions, and comments stay private to
          this space.
        </p>
        <button
          type="button"
          onClick={() => openWeekendHub("current")}
          className="mt-3 text-[11px] font-medium text-primary hover:underline"
        >
          Open this weekend&apos;s hub
        </button>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={railCard}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <Sun className="size-3.5 text-primary" aria-hidden />
          <span>Weather &amp; daylight</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Detailed property weather will connect here as your ecosystem grows. For now, check local conditions before
          heading out.
        </p>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={railCard}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <Home className="size-3.5 text-primary" aria-hidden />
          <span>Property pulse</span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Gates, climate, and generator status will surface from live integrations. Share updates in the feed so
          everyone stays aligned.
        </p>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={railCard}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <Camera className="size-3.5 text-primary" aria-hidden />
          <span>From the feed</span>
        </div>
        <p className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <Sparkles className="mt-0.5 size-3 shrink-0 text-primary/80" aria-hidden />
          Albums and highlights will pull automatically from posts you publish here.
        </p>
      </motion.div>
    </div>
  );
}
