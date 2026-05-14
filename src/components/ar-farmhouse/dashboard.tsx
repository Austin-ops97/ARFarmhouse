"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";

import { CalendarWeekendsView } from "@/components/ar-farmhouse/calendar-weekends-view";
import { DashboardAppHeader } from "@/components/ar-farmhouse/dashboard-app-header";
import { DashboardHomeView } from "@/components/ar-farmhouse/dashboard-home-view";
import { EcosystemProvider } from "@/components/ar-farmhouse/ecosystem-context";
import { DashboardMobileDrawer } from "@/components/ar-farmhouse/dashboard-mobile-drawer";
import { DashboardSidebar } from "@/components/ar-farmhouse/dashboard-sidebar";
import type { NavId } from "@/components/ar-farmhouse/dashboard-nav";
import { FeedView } from "@/components/ar-farmhouse/feed-view";
import { LocalGuideView } from "@/components/ar-farmhouse/local-guide-view";
import { PhotoAlbumView } from "@/components/ar-farmhouse/photo-album-view";
import { PropertyHubView } from "@/components/ar-farmhouse/property-hub-view";
import { PropertyMapView } from "@/components/ar-farmhouse/property-map-view";
import { SettingsView } from "@/components/ar-farmhouse/settings-view";
import { TasksView } from "@/components/ar-farmhouse/tasks-view";
import { WeekendHubPortal } from "@/components/ar-farmhouse/weekend-hub-portal";
import { PhotoAlbumProvider } from "@/contexts/photo-album-context";
import { useAuth } from "@/contexts/auth-context";
import { cnDashboardMain, cnDashboardPageBody } from "@/lib/dashboard-layout";

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
      case "album":
        return <PhotoAlbumView />;
      case "property":
        return <PropertyHubView />;
      case "settings":
        return <SettingsView />;
      default:
        return null;
    }
  }, [activeId]);

  return (
    <PhotoAlbumProvider>
      <EcosystemProvider goTo={setActiveId}>
        <div className="ar-app-shell relative min-h-dvh overflow-x-hidden bg-background">
          <DashboardSidebar activeId={activeId} onSelect={setActiveId} liveData={configured} />

          <div className="ar-app-shell-main flex min-h-dvh min-w-0 flex-col lg:pl-[248px]">
            <DashboardAppHeader
              activeId={activeId}
              mobileMenuOpen={mobileMenuOpen}
              onMobileMenuOpenChange={setMobileMenuOpen}
            />

            <main className={cnDashboardMain(activeId === "home")}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeId}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: reduceMotion ? 0.12 : 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className={cnDashboardPageBody(activeId === "home")}
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
    </PhotoAlbumProvider>
  );
}
