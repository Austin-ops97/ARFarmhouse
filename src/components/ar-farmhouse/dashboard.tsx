"use client";

import { useMemo, useState } from "react";
import { Building2, CheckSquare, Map, Settings, Sparkles, Users } from "lucide-react";

import { CalendarWeekendsView } from "@/components/ar-farmhouse/calendar-weekends-view";
import { DashboardBento } from "@/components/ar-farmhouse/dashboard-bento";
import { DashboardHero } from "@/components/ar-farmhouse/dashboard-hero";
import { DashboardMobileNav } from "@/components/ar-farmhouse/dashboard-mobile-nav";
import { DashboardSectionPlaceholder } from "@/components/ar-farmhouse/dashboard-section-placeholder";
import { DashboardSidebar } from "@/components/ar-farmhouse/dashboard-sidebar";
import { sidebarNav, type NavId } from "@/components/ar-farmhouse/dashboard-nav";
import { FeedView } from "@/components/ar-farmhouse/feed-view";

const sectionSubtitle: Record<NavId, string> = {
  home: "Aspen Ridge · this weekend",
  feed: "Private · emotionally warm",
  calendar: "Stays, RSVPs, and soft holds",
  map: "Terrain & cameras · preview",
  tasks: "Shared rhythm · preview",
  family: "People & roles · preview",
  property: "Systems at a glance · preview",
  settings: "Preferences · preview",
};

export function Dashboard() {
  const [activeId, setActiveId] = useState<NavId>("home");

  const activeMeta = useMemo(() => sidebarNav.find((n) => n.id === activeId) ?? sidebarNav[0], [activeId]);

  const main = useMemo(() => {
    switch (activeId) {
      case "home":
        return (
          <>
            <DashboardHero />
            <DashboardBento />
          </>
        );
      case "feed":
        return <FeedView />;
      case "calendar":
        return <CalendarWeekendsView />;
      case "map":
        return (
          <DashboardSectionPlaceholder
            title="Property map"
            description="Live layers, trailheads, and camera previews will live here — calm cartography, not clutter."
            icon={Map}
          />
        );
      case "tasks":
        return (
          <DashboardSectionPlaceholder
            title="Shared tasks"
            description="Household rhythm with gentle accountability — assignments, due windows, and quiet nudges."
            icon={CheckSquare}
          />
        );
      case "family":
        return (
          <DashboardSectionPlaceholder
            title="Family"
            description="Profiles, arrivals, and small rituals — the human center of the network."
            icon={Users}
          />
        );
      case "property":
        return (
          <DashboardSectionPlaceholder
            title="Property"
            description="Gates, climate, power, and maintenance stories — always legible, never alarming."
            icon={Building2}
          />
        );
      case "settings":
        return (
          <DashboardSectionPlaceholder
            title="Settings"
            description="Notifications, privacy, and device posture — tuned for a private home, not a corporation."
            icon={Settings}
          />
        );
      default:
        return null;
    }
  }, [activeId]);

  return (
    <div className="min-h-dvh bg-background">
      <DashboardSidebar activeId={activeId} onSelect={setActiveId} />

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/60 bg-background/75 px-4 py-3.5 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/55 lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-inner shadow-white/5">
              <Sparkles className="size-5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-semibold tracking-tight text-foreground">
                {activeId === "home" ? "AR Farmhouse" : activeMeta.label}
              </p>
              <p className="truncate text-xs text-muted-foreground">{sectionSubtitle[activeId]}</p>
            </div>
          </div>
          <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-muted-foreground">
            Demo
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] space-y-6 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">{main}</main>
      </div>

      <DashboardMobileNav activeId={activeId} onSelect={setActiveId} />
    </div>
  );
}
