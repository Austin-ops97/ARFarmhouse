"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type { PropertyResource, ResourceStatus } from "@/lib/property-operations";
import { usePropertyData } from "@/contexts/property-data-context";
import { cn } from "@/lib/utils";

const surface = cn("ar-surface-raised relative overflow-hidden rounded-[1.35rem]");

const statusLabel: Record<ResourceStatus, string> = {
  available: "Available",
  in_use: "In use",
  maintenance: "Maintenance",
  offline: "Offline",
};

const statusTone: Record<ResourceStatus, string> = {
  available: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/95",
  in_use: "border-amber-400/30 bg-amber-400/10 text-amber-50/95",
  maintenance: "border-orange-400/30 bg-orange-400/10 text-orange-50/95",
  offline: "border-border/50 bg-muted/40 text-muted-foreground",
};

function ResourceRow({ item, open, onToggle }: { item: PropertyResource; open: boolean; onToggle: () => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className={cn(surface, "overflow-hidden")}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/40 sm:p-5 dark:hover:bg-white/[0.04]"
      >
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/90">{item.category}</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-heading text-lg font-semibold tracking-tight text-foreground">{item.title}</p>
            {item.status && (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  statusTone[item.status]
                )}
              >
                {statusLabel[item.status]}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{item.summary}</p>
          <div className="flex flex-wrap gap-1 pt-1">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border/50 bg-muted/45 px-2 py-0.5 text-[10px] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.25 }}>
          <ChevronDown className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border/45 dark:border-white/10"
          >
            <p className="p-4 text-sm leading-relaxed text-muted-foreground sm:p-5 sm:pt-4">{item.detail}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PropertyResourcesPanel() {
  const { resources } = usePropertyData();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return resources;
    return resources.filter(
      (r) =>
        r.title.toLowerCase().includes(s) ||
        r.category.toLowerCase().includes(s) ||
        r.detail.toLowerCase().includes(s) ||
        r.tags.some((t) => t.includes(s))
    );
  }, [q, resources]);

  const categories = useMemo(() => {
    const m = new Map<string, PropertyResource[]>();
    for (const r of filtered) {
      const list = m.get(r.category) ?? [];
      list.push(r);
      m.set(r.category, list);
    }
    return Array.from(m.entries());
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className={cn(surface, "p-3 sm:p-4")}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the binder — Wi-Fi, boats, shutoffs…"
            className="rounded-xl border border-border/60 bg-card/70 pl-10 dark:border-white/10 dark:bg-white/[0.04]"
          />
        </div>
      </div>

      {resources.length === 0 ? (
        <div className={cn(surface, "px-6 py-12 text-center")}>
          <p className="font-heading text-lg font-semibold text-foreground">No property resources added yet</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Cabins, boats, ATVs, and shared equipment notes will live here — availability, photos, and maintenance when
            you add them to Firestore.
          </p>
        </div>
      ) : categories.length === 0 ? (
        <div className={cn(surface, "px-6 py-10 text-center text-sm text-muted-foreground")}>No matches for that search.</div>
      ) : (
        categories.map(([cat, items]) => (
          <section key={cat} className="space-y-3">
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <ResourceRow
                  key={item.id}
                  item={item}
                  open={openId === item.id}
                  onToggle={() => setOpenId((id) => (id === item.id ? null : item.id))}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
