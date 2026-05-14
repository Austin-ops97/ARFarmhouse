"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Settings, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { CalendarWeekendsView } from "@/components/ar-farmhouse/calendar-weekends-view";
import { DashboardAppHeader } from "@/components/ar-farmhouse/dashboard-app-header";
import { DashboardHomeView } from "@/components/ar-farmhouse/dashboard-home-view";
import { EcosystemProvider } from "@/components/ar-farmhouse/ecosystem-context";
import { DashboardMobileDrawer } from "@/components/ar-farmhouse/dashboard-mobile-drawer";
import { DashboardSectionPlaceholder } from "@/components/ar-farmhouse/dashboard-section-placeholder";
import { DashboardSidebar } from "@/components/ar-farmhouse/dashboard-sidebar";
import type { NavId } from "@/components/ar-farmhouse/dashboard-nav";
import { FeedView } from "@/components/ar-farmhouse/feed-view";
import { LocalGuideView } from "@/components/ar-farmhouse/local-guide-view";
import { PropertyHubView } from "@/components/ar-farmhouse/property-hub-view";
import { PropertyMapView } from "@/components/ar-farmhouse/property-map-view";
import { TasksView } from "@/components/ar-farmhouse/tasks-view";
import { WeekendHubPortal } from "@/components/ar-farmhouse/weekend-hub-portal";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const { configured } = useAuth();
  const [activeId, setActiveId] = useState<NavId>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

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
      <div className="ar-app-shell relative min-h-dvh overflow-x-hidden bg-background">
        <DashboardSidebar activeId={activeId} onSelect={setActiveId} liveData={configured} />

        <div className="ar-app-shell-main flex min-h-dvh min-w-0 flex-col lg:pl-[248px]">
          <DashboardAppHeader
            activeId={activeId}
            mobileMenuOpen={mobileMenuOpen}
            onMobileMenuOpenChange={setMobileMenuOpen}
          />

          <main
            className={cn(
              "min-w-0 flex-1 overflow-x-hidden pt-[var(--ar-header-height)]",
              activeId === "home"
                ? "mx-auto w-full max-w-[1180px] px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-10 sm:pt-5 lg:px-12 lg:pb-12 lg:pt-4"
                : "mx-auto w-full max-w-[1400px] px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-8 sm:pt-4 lg:px-10 lg:pb-10 lg:pt-4"
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeId}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: reduceMotion ? 0.12 : 0.26, ease: [0.22, 1, 0.36, 1] }}
                className={activeId === "home" ? "min-w-0" : "min-w-0 space-y-6"}
              >
                {main}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <DashboardMobileDrawer
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        activeId={activeId}
        onSelect={setActiveId}
      />
      <WeekendHubPortal />
    </EcosystemProvider>
  );
}
