"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Settings, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { CalendarWeekendsView } from "@/components/ar-farmhouse/calendar-weekends-view";
import { DashboardHomeView } from "@/components/ar-farmhouse/dashboard-home-view";
import { EcosystemProvider } from "@/components/ar-farmhouse/ecosystem-context";
import { DashboardMobileDrawer, DashboardMobileDrawerTrigger } from "@/components/ar-farmhouse/dashboard-mobile-drawer";
import { DashboardSectionPlaceholder } from "@/components/ar-farmhouse/dashboard-section-placeholder";
import { DashboardSidebar } from "@/components/ar-farmhouse/dashboard-sidebar";
import { sidebarNav, type NavId } from "@/components/ar-farmhouse/dashboard-nav";
import { FeedView } from "@/components/ar-farmhouse/feed-view";
import { LocalGuideView } from "@/components/ar-farmhouse/local-guide-view";
import { PropertyHubView } from "@/components/ar-farmhouse/property-hub-view";
import { PropertyMapView } from "@/components/ar-farmhouse/property-map-view";
import { TasksView } from "@/components/ar-farmhouse/tasks-view";
import { WeekendHubPortal } from "@/components/ar-farmhouse/weekend-hub-portal";

const sectionSubtitle: Record<NavId, string> = {
  home: "Living view of the property",
  feed: "Private · emotionally warm",
  calendar: "Stays, bookings, and shared weekends",
  guide: "Mena · trusted stops for the house",
  map: "Trails, pins, and quiet orientation",
  tasks: "Household rhythm · shared work",
  family: "People & roles · preview",
  property: "Status, binder, supplies",
  settings: "Preferences · preview",
};

export function Dashboard() {
  const [activeId, setActiveId] = useState<NavId>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const activeMeta = useMemo(() => sidebarNav.find((n) => n.id === activeId) ?? sidebarNav[0], [activeId]);

  const main = useMemo(() => {
    switch (activeId) {
      case "home":
        return <DashboardHomeView />;
      case "feed":
        return <FeedView />;
      case "calendar":
        return <CalendarWeekendsView />;
      case "guide":
        return <LocalGuideView />;
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
    <EcosystemProvider goTo={setActiveId}>
    <div className="ar-app-shell relative min-h-dvh overflow-x-hidden bg-background [--ar-mobile-sticky-top:calc(env(safe-area-inset-top)+3.75rem)] supports-[padding:max(0px)]:[--ar-mobile-sticky-top:calc(env(safe-area-inset-top)+3.875rem)]">
      <DashboardSidebar activeId={activeId} onSelect={setActiveId} />

      <div className="ar-app-shell-main min-w-0 lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-background/72 px-3 py-3 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/52 sm:px-4 sm:py-3.5 lg:hidden">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <DashboardMobileDrawerTrigger open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
            <div className="hidden size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-inner shadow-white/5 sm:flex">
              <Sparkles className="size-5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-[15px] font-semibold leading-tight tracking-tight text-foreground sm:text-base">
                {activeId === "home" ? "AR Farmhouse" : activeMeta.label}
              </p>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{sectionSubtitle[activeId]}</p>
            </div>
          </div>
          <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:px-3">
            Demo
          </div>
        </header>

        <main
          className={
            activeId === "home"
              ? "mx-auto max-w-[1180px] min-w-0 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-10 sm:pt-5 lg:px-12 lg:pb-12 lg:pt-4"
              : "mx-auto max-w-[1400px] min-w-0 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-8 sm:pt-4 lg:px-10 lg:pb-10 lg:pt-4"
          }
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeId}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.26, ease: [0.22, 1, 0.36, 1] }}
              className={activeId === "home" ? "" : "space-y-6"}
            >
              {main}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <DashboardMobileDrawer
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        activeId={activeId}
        onSelect={setActiveId}
      />
      <WeekendHubPortal />
    </div>
    </EcosystemProvider>
  );
}
