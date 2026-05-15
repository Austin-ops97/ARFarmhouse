"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Camera, CloudSun, Droplets, Home, Lock, Router, Users, Zap } from "lucide-react";

import type { PropertyStatusCard, StatusIconKey } from "@/lib/property-operations";
import { usePropertyData } from "@/contexts/property-data-context";
import { cn } from "@/lib/utils";

const surface = cn("ar-surface-raised relative overflow-hidden rounded-[1.35rem]");

const icons: Record<StatusIconKey, typeof CloudSun> = {
  cloud: CloudSun,
  zap: Zap,
  router: Router,
  droplets: Droplets,
  users: Users,
  home: Home,
  lock: Lock,
  camera: Camera,
};

const toneClass: Record<NonNullable<PropertyStatusCard["tone"]>, string> = {
  default: "from-muted/50 to-transparent dark:from-white/[0.06] dark:to-transparent",
  mint: "from-primary/14 to-transparent",
  amber: "from-amber-400/12 to-transparent",
  rose: "from-rose-400/10 to-transparent",
};

export function PropertyStatusPanel() {
  const reduceMotion = useReducedMotion();
  const { statusCards } = usePropertyData();

  if (statusCards.length === 0) {
    return (
      <div className={cn(surface, "col-span-full px-6 py-12 text-center sm:py-14")}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border/55 bg-muted/40 dark:border-white/10 dark:bg-white/[0.05]">
          <CloudSun className="size-6 text-primary" aria-hidden />
        </div>
        <p className="mt-5 font-heading text-lg font-semibold text-foreground">Property status at a glance</p>
        <p className="mt-2 mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">
          Weather, gate access, utilities, and occupancy will appear here when your family adds status cards — calm,
          glanceable, and real.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="px-1 text-[11px] text-muted-foreground">
        {statusCards.length} live signal{statusCards.length === 1 ? "" : "s"} · property operations
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statusCards.map((card, i) => {
        const Icon = icons[card.icon];
        const tone = card.tone ?? "default";
        return (
          <motion.div
            key={card.id}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-8%" }}
            transition={{ delay: reduceMotion ? 0 : i * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            whileHover={reduceMotion ? undefined : { y: -3 }}
            className={cn(surface, "overflow-hidden p-4 sm:p-5")}
          >
            <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90", toneClass[tone])} />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/55 bg-muted/55 dark:border-white/10 dark:bg-white/[0.06]">
                <Icon className="size-5 text-primary" aria-hidden />
              </div>
            </div>
            <p className="relative mt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{card.title}</p>
            <p className="relative mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground">{card.value}</p>
            {card.hint && <p className="relative mt-2 text-xs leading-relaxed text-muted-foreground">{card.hint}</p>}
          </motion.div>
        );
      })}
      </div>
    </div>
  );
}
