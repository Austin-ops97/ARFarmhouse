"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

import { type NavId, sidebarNav } from "./dashboard-nav";

type DashboardSidebarProps = {
  activeId: NavId;
  onSelect: (id: NavId) => void;
};

export function DashboardSidebar({ activeId, onSelect }: DashboardSidebarProps) {
  const reduceMotion = useReducedMotion();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-border/70 bg-sidebar/85 px-3 py-6 backdrop-blur-2xl lg:flex">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-inner shadow-white/5">
          <Sparkles className="size-5 text-primary" aria-hidden />
        </div>
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
                  ? "bg-white/[0.07] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
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

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-relaxed text-muted-foreground">
        Everything here is demo data — crafted for motion, spacing, and calm hierarchy.
      </div>
    </aside>
  );
}
