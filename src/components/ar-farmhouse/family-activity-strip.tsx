"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { NotificationCenterSheet } from "@/components/ar-farmhouse/notification-center-sheet";
import { useNotifications } from "@/contexts/notifications-context";
import { useHomeCalendarEvents } from "@/contexts/home-calendar-context";
import { buildCoordinationHighlights } from "@/lib/activity-coordination";
import { cn } from "@/lib/utils";

export function FamilyActivityStrip() {
  const reduceMotion = useReducedMotion();
  const { notifications, unreadCount } = useNotifications();
  const events = useHomeCalendarEvents();
  const [sheetOpen, setSheetOpen] = useState(false);

  const highlights = useMemo(
    () => buildCoordinationHighlights({ calendarEvents: events, notifications }),
    [events, notifications]
  );

  if (highlights.length === 0) return null;

  return (
    <section className="relative">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
            Family pulse
          </p>
          <h2 className="mt-2 font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Coordination at a glance
          </h2>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary"
          >
            {unreadCount} new
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {highlights.map((h, i) => (
          <motion.button
            key={h.id}
            type="button"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : i * 0.05 }}
            onClick={() => setSheetOpen(true)}
            className={cn(
              "rounded-2xl border px-4 py-4 text-left transition-colors hover:bg-muted/40",
              h.tone === "mint" && "border-primary/25 bg-primary/[0.05]",
              h.tone === "amber" && "border-amber-500/30 bg-amber-500/[0.06]",
              h.tone === "default" && "border-border/50 bg-card/40 dark:border-white/[0.08]"
            )}
          >
            <Sparkles className="mb-2 size-4 text-primary" aria-hidden />
            <p className="text-sm font-semibold text-foreground">{h.title}</p>
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{h.subtitle}</p>
          </motion.button>
        ))}
      </div>

      <NotificationCenterSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </section>
  );
}
