"use client";

import {
  Building2,
  Calendar,
  CheckSquare,
  Compass,
  Images,
  Map,
  MessageSquare,
  Settings,
} from "lucide-react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import type { NavId } from "@/components/ar-farmhouse/dashboard-nav";
import { cn } from "@/lib/utils";

const paths: { id: string; label: string; icon: typeof Calendar; nav: NavId }[] = [
  { id: "feed", label: "Feed", icon: MessageSquare, nav: "feed" },
  { id: "calendar", label: "Calendar", icon: Calendar, nav: "calendar" },
  { id: "tasks", label: "Tasks", icon: CheckSquare, nav: "tasks" },
  { id: "album", label: "Album", icon: Images, nav: "album" },
  { id: "property", label: "Property", icon: Building2, nav: "property" },
  { id: "map", label: "Map", icon: Map, nav: "map" },
  { id: "guide", label: "Resources", icon: Compass, nav: "guide" },
  { id: "settings", label: "Settings", icon: Settings, nav: "settings" },
];

export function HomeQuickActions() {
  const { goTo } = useEcosystem();

  return (
    <section
      className="relative rounded-[1.125rem] border border-border/32 bg-muted/14 px-3 py-3.5 dark:border-white/[0.04] dark:bg-white/[0.018] sm:px-4 sm:py-4"
      aria-label="Quick paths"
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/72 sm:text-[11px] sm:tracking-[0.21em]">
        Quick paths
      </p>
      <p className="mt-1 text-[13px] leading-snug text-muted-foreground sm:text-sm">Jump to any area of the property app.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2">
        {paths.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => goTo(a.nav)}
              className={cn(
                "flex min-h-12 items-center gap-2.5 rounded-xl border border-border/40 bg-background/50 px-3 py-2.5 text-left text-[13px] font-medium text-foreground/95 shadow-[var(--ar-float-subtle)]",
                "transition active:scale-[0.985] hover:border-border/75 hover:bg-background/72 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-white/[0.1] dark:hover:bg-white/[0.055]",
                "touch-manipulation"
              )}
            >
              <Icon className="size-4 shrink-0 text-primary/85" aria-hidden />
              <span className="truncate">{a.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
