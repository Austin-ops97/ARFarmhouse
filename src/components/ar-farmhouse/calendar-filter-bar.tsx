"use client";

import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import {
  CALENDAR_FILTER_OPTIONS,
  type CalendarFilterId,
  type CalendarFilterState,
} from "@/lib/calendar-filters";
import { cn } from "@/lib/utils";

type CalendarFilterBarProps = {
  filters: CalendarFilterState;
  onChange: (next: CalendarFilterState) => void;
  showAdminSearch?: boolean;
};

export function CalendarFilterBar({ filters, onChange, showAdminSearch }: CalendarFilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = (id: CalendarFilterId) => {
    if (id === "all") {
      onChange({ ...filters, active: ["all"] });
      return;
    }
    const withoutAll = filters.active.filter((f) => f !== "all");
    const has = withoutAll.includes(id);
    const next = has ? withoutAll.filter((f) => f !== id) : [...withoutAll, id];
    onChange({ ...filters, active: next.length === 0 ? ["all"] : next });
  };

  return (
    <motion.div
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            placeholder={showAdminSearch ? "Search titles or guests…" : "Search calendar…"}
            className="min-h-11 rounded-xl pl-9"
          />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/55 transition-colors dark:border-white/10",
            expanded ? "bg-primary/12 text-primary" : "bg-muted/30 text-muted-foreground"
          )}
          aria-expanded={expanded}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal className="size-4" />
        </button>
      </div>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex flex-wrap gap-1.5"
        >
          {CALENDAR_FILTER_OPTIONS.map((opt) => {
            const active =
              opt.id === "all"
                ? filters.active.includes("all") || filters.active.length === 0
                : filters.active.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation",
                  active
                    ? "border-primary/35 bg-primary/12 text-foreground"
                    : "border-border/50 bg-muted/25 text-muted-foreground hover:text-foreground dark:border-white/10"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
