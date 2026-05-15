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
    <section className="relative" aria-label="Quick paths">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">Quick paths</p>
      <p className="mt-1.5 text-sm text-muted-foreground">Jump to any area of the property app.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        {paths.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => goTo(a.nav)}
              className={cn(
                "flex min-h-[3.25rem] items-center gap-2.5 rounded-2xl border border-border/55 bg-card/80 px-3.5 py-3 text-left text-sm font-medium text-foreground shadow-[var(--ar-float-elevate)]",
                "transition hover:border-border hover:bg-muted/70 dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-white/[0.12] dark:hover:bg-white/[0.06]"
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
