"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut, Settings, Sparkles, Users } from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";

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
  const { configured, user, signOut, displayName, avatarUrl } = useAuth();
  const [activeId, setActiveId] = useState<NavId>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
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
      <DashboardSidebar activeId={activeId} onSelect={setActiveId} liveData={configured} />

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
          <div className="relative shrink-0">
            {configured && user ? (
              <>
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  className="flex max-w-[180px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-1 pl-1 pr-2.5 text-left transition-colors hover:border-white/16 hover:bg-white/[0.08] sm:max-w-[220px] sm:pr-3"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  <Avatar size="default" className="size-8 ring-1 ring-white/10">
                    <AvatarImage src={avatarUrl ?? undefined} alt="" />
                    <AvatarFallback className="text-xs">{displayName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground sm:text-xs">
                    {displayName}
                  </span>
                </button>
                {accountOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-40 cursor-default bg-transparent"
                      aria-label="Close menu"
                      onClick={() => setAccountOpen(false)}
                    />
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/12 bg-background/95 py-1 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
                      role="menu"
                    >
                      <p className="truncate px-3 py-2 text-[11px] text-muted-foreground">{user.email}</p>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-white/[0.06]"
                        onClick={() => {
                          setAccountOpen(false);
                          void signOut();
                        }}
                      >
                        <LogOut className="size-4 shrink-0 opacity-80" aria-hidden />
                        Sign out
                      </button>
                    </motion.div>
                  </>
                )}
              </>
            ) : (
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-muted-foreground sm:px-3">
                Demo
              </div>
            )}
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
