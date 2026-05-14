"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Settings, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { CalendarWeekendsView } from "@/components/ar-farmhouse/calendar-weekends-view";
import { DashboardBento } from "@/components/ar-farmhouse/dashboard-bento";
import { DashboardHero } from "@/components/ar-farmhouse/dashboard-hero";
import { DashboardMobileNav } from "@/components/ar-farmhouse/dashboard-mobile-nav";
import { DashboardSectionPlaceholder } from "@/components/ar-farmhouse/dashboard-section-placeholder";
import { DashboardSidebar } from "@/components/ar-farmhouse/dashboard-sidebar";
import { sidebarNav, type NavId } from "@/components/ar-farmhouse/dashboard-nav";
import { FeedView } from "@/components/ar-farmhouse/feed-view";
import { PropertyHubView } from "@/components/ar-farmhouse/property-hub-view";
import { PropertyMapView } from "@/components/ar-farmhouse/property-map-view";
import { TasksView } from "@/components/ar-farmhouse/tasks-view";

const sectionSubtitle: Record<NavId, string> = {
  home: "Aspen Ridge · this weekend",
  feed: "Private · emotionally warm",
  calendar: "Stays, RSVPs, and soft holds",
  map: "Trails, pins, and quiet orientation",
  tasks: "Household rhythm · shared work",
  family: "People & roles · preview",
  property: "Status, binder, supplies",
  settings: "Preferences · preview",
};

export function Dashboard() {
  const [activeId, setActiveId] = useState<NavId>("home");
  const reduceMotion = useReducedMotion();

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
        return <PropertyMapView />;
      case "tasks":
        return <TasksView />;
      case "family":
        return (
          <DashboardSectionPlaceholder
            title="Family"
            description="Profiles, arrivals, and small rituals — the human center of the network."
            icon={Users}
          />
        );
      case "property":
        return <PropertyHubView />;
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

        <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeId}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              {main}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <DashboardMobileNav activeId={activeId} onSelect={setActiveId} />
    </div>
  );
}
