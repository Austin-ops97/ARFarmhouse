"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type { DemoResource } from "@/lib/operations-demo";
import { demoResources } from "@/lib/operations-demo";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

function ResourceRow({ item, open, onToggle }: { item: DemoResource; open: boolean; onToggle: () => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className={cn(surface, "overflow-hidden")}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-white/[0.04] sm:p-5"
      >
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary/90">{item.category}</p>
          <p className="font-heading text-lg font-semibold tracking-tight text-foreground">{item.title}</p>
          <p className="text-sm text-muted-foreground">{item.summary}</p>
          <div className="flex flex-wrap gap-1 pt-1">
            {item.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground">
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
            className="overflow-hidden border-t border-white/10"
          >
            <p className="p-4 text-sm leading-relaxed text-muted-foreground sm:p-5 sm:pt-4">{item.detail}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PropertyResourcesPanel() {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>("r1");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return demoResources;
    return demoResources.filter(
      (r) =>
        r.title.toLowerCase().includes(s) ||
        r.category.toLowerCase().includes(s) ||
        r.detail.toLowerCase().includes(s) ||
        r.tags.some((t) => t.includes(s))
    );
  }, [q]);

  const categories = useMemo(() => {
    const m = new Map<string, DemoResource[]>();
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
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the binder — Wi-Fi, boats, shutoffs…"
            className="rounded-xl border-white/10 bg-white/[0.04] pl-10"
          />
        </div>
      </div>

      {categories.map(([cat, items]) => (
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
      ))}
    </div>
  );
}
