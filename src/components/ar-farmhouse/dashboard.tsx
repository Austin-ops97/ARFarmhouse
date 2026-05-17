"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { Suspense, startTransition, useEffect, useMemo, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { DashboardAppHeader } from "@/components/ar-farmhouse/dashboard-app-header";
import { DashboardHomeView } from "@/components/ar-farmhouse/dashboard-home-view";
import { DashboardViewFallback } from "@/components/ar-farmhouse/dashboard-view-fallback";
import { EcosystemProvider } from "@/components/ar-farmhouse/ecosystem-context";
import { DashboardMobileDrawer } from "@/components/ar-farmhouse/dashboard-mobile-drawer";
import { DashboardSidebar } from "@/components/ar-farmhouse/dashboard-sidebar";
import { AdminView } from "@/components/ar-farmhouse/admin-view";
import type { NavId } from "@/components/ar-farmhouse/dashboard-nav";
import { OfflineStatusBar } from "@/components/ar-farmhouse/offline-status-bar";
import { isAdmin } from "@/lib/permissions";
import { dashboardViewSpring, dashboardViewTransition } from "@/platform/navigation/transitions";
import { useAppStore } from "@/platform/state/app-store";
import { PropertyDataScope } from "@/components/ar-farmhouse/property-data-scope";
import { FeedPostsProvider } from "@/contexts/feed-posts-context";
import { PhotoAlbumLightboxHost } from "@/components/ar-farmhouse/photo-album-lightbox-host";
import { PhotoAlbumProvider } from "@/contexts/photo-album-context";
import { NotificationsProvider } from "@/contexts/notifications-context";
import { PushNotificationsProvider } from "@/contexts/push-notifications-context";
import { PushNotificationBootstrap } from "@/components/push/push-notification-bootstrap";
import { PwaInstallBanner } from "@/components/push/pwa-install-banner";
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
const RouteChecklistsView = dynamic(
  () => import("@/components/ar-farmhouse/checklists-view").then((m) => m.ChecklistsView),
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
  const { configured, profile } = useAuth();
  const searchParams = useSearchParams();
  const highlightPostId = searchParams.get("post");
  const activeId = useAppStore((s) => s.activeNavId);
  const setActiveId = useAppStore((s) => s.setActiveNavId);
  const mobileMenuOpen = useAppStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useAppStore((s) => s.setMobileMenuOpen);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const pid = searchParams.get("post");
    if (!pid) return;
    startTransition(() => setActiveId("feed"));
  }, [searchParams, setActiveId]);

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
      case "checklists":
        return <RouteChecklistsView />;
      case "album":
        return <RoutePhotoAlbumView />;
      case "property":
        return <RoutePropertyHubView />;
      case "profile":
        return <RouteProfileView />;
      case "settings":
        return <RouteSettingsView />;
      case "admin":
        return isAdmin(profile) ? <AdminView /> : <DashboardHomeView />;
      default:
        return null;
    }
  }, [activeId, highlightPostId]);

  return (
    <>
      <div className="ar-app-shell relative min-h-dvh overflow-x-hidden bg-background">
        <DashboardSidebar activeId={activeId} onSelect={setActiveId} liveData={configured} />

        <div className="ar-app-shell-main flex min-h-dvh min-w-0 flex-col lg:pl-[248px]">
          <DashboardAppHeader
            activeId={activeId}
            mobileMenuOpen={mobileMenuOpen}
            onMobileMenuOpenChange={setMobileMenuOpen}
          />
          <OfflineStatusBar />
          <div className="px-1 pt-2 lg:px-4">
            <PwaInstallBanner />
          </div>

          <main className={cnDashboardMain(activeId === "home")}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeId}
                initial={reduceMotion ? false : dashboardViewTransition.initial}
                animate={dashboardViewTransition.animate}
                exit={reduceMotion ? undefined : dashboardViewTransition.exit}
                transition={
                  reduceMotion
                    ? { duration: 0.12 }
                    : dashboardViewSpring
                }
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
    </>
  );
}

/** Wraps authenticated shell + push bootstrap under a single ecosystem navigation scope. */
function DashboardEcosystemShell({ children }: { children: ReactNode }) {
  const setActiveId = useAppStore((s) => s.setActiveNavId);
  return (
    <EcosystemProvider goTo={setActiveId}>
      <ErrorBoundary title="Push notifications unavailable">
        <PushNotificationBootstrap />
      </ErrorBoundary>
      {children}
    </EcosystemProvider>
  );
}

export function Dashboard() {
  return (
    <FeedPostsProvider>
      <SavedPostsProvider>
        <NotificationsProvider>
        <PushNotificationsProvider>
        <DashboardEcosystemShell>
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
        </DashboardEcosystemShell>
        </PushNotificationsProvider>
        </NotificationsProvider>
      </SavedPostsProvider>
    </FeedPostsProvider>
  );
}
