"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Gauge, Package } from "lucide-react";
import { useState } from "react";

import { PropertyInventoryPanel } from "@/components/ar-farmhouse/property-inventory-panel";
import { PropertyResourcesPanel } from "@/components/ar-farmhouse/property-resources-panel";
import { PropertyStatusPanel } from "@/components/ar-farmhouse/property-status-panel";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

type HubTab = "status" | "resources" | "inventory";

const tabs: { id: HubTab; label: string; icon: typeof Gauge }[] = [
  { id: "status", label: "Status", icon: Gauge },
  { id: "resources", label: "Resources", icon: BookOpen },
  { id: "inventory", label: "Supplies", icon: Package },
];

export function PropertyHubView() {
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<HubTab>("status");

  return (
    <div className="space-y-6">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(surface, "p-4 sm:p-6")}
      >
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Property hub</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Systems, binders, and pantries — one calm place for how the ridge actually runs.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          {tabs.map((t) => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors sm:flex-none sm:px-5",
                  active ? "bg-white/[0.1] text-foreground shadow-inner shadow-white/5" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
      </motion.section>

      <motion.div
        key={tab}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {tab === "status" && <PropertyStatusPanel />}
        {tab === "resources" && <PropertyResourcesPanel />}
        {tab === "inventory" && <PropertyInventoryPanel />}
      </motion.div>
    </div>
  );
}
