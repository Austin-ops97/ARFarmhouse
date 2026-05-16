"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import { AdminModerationView } from "@/components/ar-farmhouse/admin-moderation-view";
import { AdminOverviewView } from "@/components/ar-farmhouse/admin-overview-view";
import { AdminSettingsView } from "@/components/ar-farmhouse/admin-settings-view";
import { stickyHeaderClass } from "@/platform/navigation/transitions";
import { cn } from "@/lib/utils";

type AdminTab = "overview" | "moderation" | "settings";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "moderation", label: "Moderation" },
  { id: "settings", label: "Settings" },
];

export function AdminView() {
  const reduceMotion = useReducedMotion();
  const [tab, setTab] = useState<AdminTab>("overview");

  return (
    <div className="mx-auto min-w-0 max-w-2xl">
      <div className={cn(stickyHeaderClass, "px-4 pb-3 pt-2 sm:px-6")}>
        <motion.div
          layout={!reduceMotion}
          className="ar-surface-float flex min-h-11 rounded-2xl p-1"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors",
                tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === t.id && (
                <motion.span
                  layoutId="admin-tab"
                  className="absolute inset-0 rounded-xl border border-primary/25 bg-primary/12"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </motion.div>
      </div>
      {tab === "overview" ? (
        <AdminOverviewView embedded />
      ) : tab === "moderation" ? (
        <AdminModerationView embedded />
      ) : (
        <AdminSettingsView />
      )}
    </div>
  );
}
