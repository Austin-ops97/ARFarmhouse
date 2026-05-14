"use client";

import { CalendarPlus, Compass, Map, PenLine, Rss } from "lucide-react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { cn } from "@/lib/utils";

const actions = [
  { id: "book", label: "Book weekend", icon: CalendarPlus, nav: "calendar" as const },
  { id: "post", label: "Add post", icon: PenLine, nav: "feed" as const },
  { id: "map", label: "Open map", icon: Map, nav: "map" as const },
  { id: "guide", label: "Local guide", icon: Compass, nav: "guide" as const },
];

export function HomeQuickActions() {
  const { goTo } = useEcosystem();

  return (
    <section className="relative" aria-label="Quick paths">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
          <Rss className="size-4 text-primary/80" aria-hidden />
          Quick paths
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2 sm:mt-4 sm:gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => goTo(a.nav)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2 text-sm font-medium text-foreground",
                "shadow-[0_18px_50px_-38px_rgba(0,0,0,0.85)] transition hover:border-white/[0.12] hover:bg-white/[0.06]"
              )}
            >
              <Icon className="size-4 text-primary/85" aria-hidden />
              {a.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
