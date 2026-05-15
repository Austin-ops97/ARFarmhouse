"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Gauge, Package } from "lucide-react";
import { useMemo, useState } from "react";

import { PropertyInventoryPanel } from "@/components/ar-farmhouse/property-inventory-panel";
import { usePropertyData } from "@/contexts/property-data-context";
import { PropertyResourcesPanel } from "@/components/ar-farmhouse/property-resources-panel";
import { PropertyStatusPanel } from "@/components/ar-farmhouse/property-status-panel";
import { SyncStatusBanner } from "@/components/ar-farmhouse/sync-status-banner";
import { cn } from "@/lib/utils";

const surface = cn("ar-surface-raised relative overflow-hidden rounded-[1.35rem]");

type HubTab = "status" | "resources" | "inventory";

const tabs: { id: HubTab; label: string; icon: typeof Gauge }[] = [
  { id: "status", label: "Status", icon: Gauge },
  { id: "resources", label: "Resources", icon: BookOpen },
  { id: "inventory", label: "Supplies", icon: Package },
];

export function PropertyHubView() {
  const reduceMotion = useReducedMotion();
  const { statusCards, resources, inventory, propertySyncError, calendarError, tasksError } =
    usePropertyData();
  const syncError = propertySyncError ?? calendarError ?? tasksError;
  const [tab, setTab] = useState<HubTab>("status");

  const tabCounts = useMemo(
    () => ({
      status: statusCards.length,
      resources: resources.length,
      inventory: inventory.length,
    }),
    [statusCards.length, resources.length, inventory.length]
  );

  return (
    <div className="space-y-6">
      <SyncStatusBanner error={syncError} />
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(surface, "p-4 sm:p-6")}
      >
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Property hub</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Systems, binders, and pantries — one calm place for how AR Farmhouse actually runs.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-border/55 bg-muted/40 p-1 dark:border-white/10 dark:bg-white/[0.03]">
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
                  active
                    ? "bg-card text-foreground shadow-sm dark:bg-white/[0.1] dark:shadow-inner dark:shadow-white/5"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                {t.label}
                {tabCounts[t.id] > 0 ? (
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] tabular-nums text-primary">
                    {tabCounts[t.id]}
                  </span>
                ) : null}
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
