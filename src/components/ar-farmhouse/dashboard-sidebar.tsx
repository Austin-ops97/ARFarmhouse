"use client";

import { motion, useReducedMotion } from "framer-motion";

import { ArFarmhouseLogo } from "@/components/ar-farmhouse/ar-farmhouse-logo";
import { cn } from "@/lib/utils";

import { type NavId, sidebarNav } from "./dashboard-nav";

type DashboardSidebarProps = {
  activeId: NavId;
  onSelect: (id: NavId) => void;
  liveData?: boolean;
};

export function DashboardSidebar({ activeId, onSelect, liveData = false }: DashboardSidebarProps) {
  const reduceMotion = useReducedMotion();

  return (
    <aside className="ar-header-blur fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-border/60 bg-sidebar/92 px-3 py-6 backdrop-blur-2xl lg:flex dark:border-white/[0.06] dark:bg-sidebar/90">
      <div className="mb-8 flex items-center gap-3 px-2">
        <ArFarmhouseLogo size={44} className="shadow-[var(--ar-float-elevate)] dark:shadow-inner dark:shadow-white/5" />
        <div className="min-w-0">
          <p className="font-heading text-lg font-semibold tracking-tight text-foreground">AR Farmhouse</p>
          <p className="truncate text-xs text-muted-foreground">Private network</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
        {sidebarNav.map((item, index) => {
          const active = activeId === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduceMotion ? 0 : index * 0.04 }}
              whileHover={reduceMotion ? undefined : { x: 2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                active
                  ? "bg-card/90 text-foreground shadow-[var(--ar-float-elevate)] ring-1 ring-border/50 dark:bg-white/[0.07] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-0"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground dark:hover:bg-white/[0.04]"
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-2xl border border-primary/25 bg-primary/10"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon className="relative z-10 size-[18px] shrink-0" aria-hidden />
              <span className="relative z-10 font-medium">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>

      <div className="mt-6 rounded-2xl border border-border/50 bg-muted/45 px-4 py-3.5 text-[11px] leading-relaxed text-muted-foreground/95 shadow-[var(--ar-inset-press)] ring-1 ring-border/35 dark:bg-white/[0.025] dark:ring-white/[0.05]">
        {liveData
          ? "Signed in · feed and profile stay in sync for your family."
          : "Add your Firebase keys in environment variables to enable live feed and profile sync."}
      </div>
    </aside>
  );
}
