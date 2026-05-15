"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { Suspense, startTransition, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { DashboardAppHeader } from "@/components/ar-farmhouse/dashboard-app-header";
import { DashboardHomeView } from "@/components/ar-farmhouse/dashboard-home-view";
import { DashboardViewFallback } from "@/components/ar-farmhouse/dashboard-view-fallback";
import { EcosystemProvider } from "@/components/ar-farmhouse/ecosystem-context";
import { DashboardMobileDrawer } from "@/components/ar-farmhouse/dashboard-mobile-drawer";
import { DashboardSidebar } from "@/components/ar-farmhouse/dashboard-sidebar";
import type { NavId } from "@/components/ar-farmhouse/dashboard-nav";
import { PropertyDataScope } from "@/components/ar-farmhouse/property-data-scope";
import { FeedPostsProvider } from "@/contexts/feed-posts-context";
import { PhotoAlbumLightboxHost } from "@/components/ar-farmhouse/photo-album-lightbox-host";
import { PhotoAlbumProvider } from "@/contexts/photo-album-context";
import { NotificationsProvider } from "@/contexts/notifications-context";
import { SavedPostsProvider } from "@/contexts/saved-posts-context";
import { useAuth } from "@/contexts/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { cnDashboardMain, cnDashboardPageBody } from "@/lib/dashboard-layout";

const RouteFeedView = dynamic(
  () => import("@/components/ar-farmhouse/feed-view").then((m) => m.FeedView),
  { loading: () => <DashboardViewFallback /> }
);
const RouteCalendarWeekendsView = dynamic(
  () => import("@/components/ar-farmhouse/calendar-weekends-view").then((m) => m.CalendarWeekendsView),
  { loading: () => <DashboardViewFallback /> }
);
const RouteLocalGuideView = dynamic(
  () => import("@/components/ar-farmhouse/local-guide-view").then((m) => m.LocalGuideView),
  { loading: () => <DashboardViewFallback /> }
);
const RoutePropertyMapView = dynamic(
  () => import("@/components/ar-farmhouse/property-map-view").then((m) => m.PropertyMapView),
  { loading: () => <DashboardViewFallback /> }
);
const RouteTasksView = dynamic(
  () => import("@/components/ar-farmhouse/tasks-view").then((m) => m.TasksView),
  { loading: () => <DashboardViewFallback /> }
);
const RoutePhotoAlbumView = dynamic(
  () => import("@/components/ar-farmhouse/photo-album-view").then((m) => m.PhotoAlbumView),
  { loading: () => <DashboardViewFallback /> }
);
const RoutePropertyHubView = dynamic(
  () => import("@/components/ar-farmhouse/property-hub-view").then((m) => m.PropertyHubView),
  { loading: () => <DashboardViewFallback /> }
);
const RouteProfileView = dynamic(
  () => import("@/components/ar-farmhouse/profile-view").then((m) => m.ProfileView),
  { loading: () => <DashboardViewFallback /> }
);
const RouteSettingsView = dynamic(
  () => import("@/components/ar-farmhouse/settings-view").then((m) => m.SettingsView),
  { loading: () => <DashboardViewFallback /> }
);

const RouteWeekendHubPortal = dynamic(
  () => import("@/components/ar-farmhouse/weekend-hub-portal").then((m) => m.WeekendHubPortal),
  { loading: () => null }
);

function DashboardRoutes() {
  const { configured } = useAuth();
  const searchParams = useSearchParams();
  const highlightPostId = searchParams.get("post");
  const [activeId, setActiveId] = useState<NavId>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const pid = searchParams.get("post");
    if (!pid) return;
    startTransition(() => setActiveId("feed"));
  }, [searchParams]);

  useEffect(() => {
    if (activeId !== "feed" || !highlightPostId) return;
    const t = window.setTimeout(() => {
      document.getElementById(`feed-post-${highlightPostId}`)?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
    }, 280);
    return () => window.clearTimeout(t);
  }, [activeId, highlightPostId, reduceMotion]);

  const main = useMemo(() => {
    switch (activeId) {
      case "home":
        return <DashboardHomeView />;
      case "feed":
        return <RouteFeedView highlightPostId={highlightPostId} />;
      case "calendar":
        return <RouteCalendarWeekendsView />;
      case "guide":
        return <RouteLocalGuideView />;
      case "map":
        return <RoutePropertyMapView />;
      case "tasks":
        return <RouteTasksView />;
      case "album":
        return <RoutePhotoAlbumView />;
      case "property":
        return <RoutePropertyHubView />;
      case "profile":
        return <RouteProfileView />;
      case "settings":
        return <RouteSettingsView />;
      default:
        return null;
    }
  }, [activeId, highlightPostId]);

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

          <main className={cnDashboardMain(activeId === "home")}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeId}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
                transition={{ duration: reduceMotion ? 0.12 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={cnDashboardPageBody(activeId === "home")}
              >
                <ErrorBoundary title="This section needs a refresh">
                  <PropertyDataScope activeId={activeId}>{main}</PropertyDataScope>
                </ErrorBoundary>
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
      <RouteWeekendHubPortal />
      <PhotoAlbumLightboxHost />
    </EcosystemProvider>
  );
}

export function Dashboard() {
  return (
    <FeedPostsProvider>
      <SavedPostsProvider>
        <NotificationsProvider>
        <PhotoAlbumProvider>
          <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center bg-background px-6">
            <div className="w-full max-w-md space-y-4">
              <div className="h-10 w-48 animate-pulse rounded-2xl bg-muted/50 dark:bg-white/[0.06]" />
              <div className="h-64 w-full animate-pulse rounded-[1.35rem] bg-muted/40 dark:bg-white/[0.04]" />
            </div>
          </div>
        }
      >
          <DashboardRoutes />
        </Suspense>
        </PhotoAlbumProvider>
        </NotificationsProvider>
      </SavedPostsProvider>
    </FeedPostsProvider>
  );
}
