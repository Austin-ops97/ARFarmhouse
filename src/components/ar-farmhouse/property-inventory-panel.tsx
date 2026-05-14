"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Package } from "lucide-react";

import { demoInventory } from "@/lib/operations-demo";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

export function PropertyInventoryPanel() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="space-y-4">
      <div className={cn(surface, "flex items-start gap-3 p-4 sm:p-5")}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
          <Package className="size-5 text-primary" aria-hidden />
        </span>
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground">Shared supplies</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Honest counts, gentle nudges when something runs low — no warehouse vibes.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {demoInventory.map((item, i) => (
          <motion.div
            key={item.id}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: reduceMotion ? 0 : i * 0.03, duration: 0.4 }}
            whileHover={reduceMotion ? undefined : { y: -2 }}
            className={cn(surface, "p-4 sm:p-5", item.low && "border-amber-400/25 ring-1 ring-amber-400/15")}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              {item.low && <AlertTriangle className="size-4 shrink-0 text-amber-300/90" aria-hidden />}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Unit · {item.unit}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className={cn("h-full rounded-full", item.low ? "bg-amber-400/80" : "bg-primary/70")}
                initial={{ width: 0 }}
                whileInView={{ width: `${item.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="mt-2 text-xs tabular-nums text-muted-foreground">{item.pct}% on hand</p>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Updated by <span className="font-medium text-foreground">{item.lastUpdatedBy}</span> · {item.lastUpdated}
            </p>
            {item.restockHint && (
              <p className="mt-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-50/95">{item.restockHint}</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
