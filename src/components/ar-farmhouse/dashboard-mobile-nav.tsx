"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

import { mobileNav, type NavId } from "./dashboard-nav";

type MobileBottomNavProps = {
  activeId: NavId;
  onSelect: (id: NavId) => void;
};

export function DashboardMobileNav({ activeId, onSelect }: MobileBottomNavProps) {
  const reduceMotion = useReducedMotion();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/70 bg-background/75 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl lg:hidden"
      aria-label="Mobile primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
        {mobileNav.map((item) => {
          const active = activeId === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-2xl border transition-colors",
                  active
                    ? "border-primary/35 bg-primary/15 text-primary"
                    : "border-transparent bg-white/[0.03] text-muted-foreground"
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="truncate">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
