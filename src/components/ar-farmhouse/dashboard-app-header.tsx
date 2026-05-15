"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { LogOut, UserRound } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { ArFarmhouseLogo } from "@/components/ar-farmhouse/ar-farmhouse-logo";
import { NotificationBell } from "@/components/ar-farmhouse/notification-bell";
import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { DashboardMobileDrawerTrigger } from "@/components/ar-farmhouse/dashboard-mobile-drawer";
import { OverlayPortal } from "@/components/ar-farmhouse/overlay-portal";
import { sidebarNav, type NavId } from "@/components/ar-farmhouse/dashboard-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { AR_ACCOUNT_MENU } from "@/lib/mobile-overlay";
import { cn } from "@/lib/utils";

const sectionSubtitle: Record<NavId, string> = {
  home: "Living view of the property",
  feed: "Private · emotionally warm",
  calendar: "Stays, bookings, and shared weekends",
  guide: "Mena · trusted stops for the house",
  map: "Trails, pins, and quiet orientation",
  tasks: "Household rhythm · shared work",
  album: "Visual memory archive · feed-connected",
  property: "Status, binder, supplies",
  profile: "Family, pets, and your photo",
  settings: "Preferences · calm control room",
};

type DashboardAppHeaderProps = {
  activeId: NavId;
  mobileMenuOpen: boolean;
  onMobileMenuOpenChange: (open: boolean) => void;
};

export function DashboardAppHeader({
  activeId,
  mobileMenuOpen,
  onMobileMenuOpenChange,
}: DashboardAppHeaderProps) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const { goTo } = useEcosystem();
  const { user, signOut, displayName, avatarUrl } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [elevated, setElevated] = useState(false);
  useBodyScrollLock(accountOpen);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    setElevated(y > 10);
  });

  const activeMeta = sidebarNav.find((n) => n.id === activeId) ?? sidebarNav[0];

  return (
    <header
      className={cn(
        "fixed top-0 z-[45] box-border min-h-[var(--ar-header-height)] w-full border-b",
        "left-0 lg:left-[248px] lg:right-0",
        "transition-[background-color,box-shadow,border-color] duration-300 ease-out",
        elevated
          ? "border-border/60 bg-background/88 shadow-[var(--ar-panel-elevate)] dark:border-white/[0.1] dark:bg-background/88 dark:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.55)]"
          : "border-border/45 bg-background/78 dark:border-white/[0.06] dark:bg-background/72"
      )}
    >
      <div className="ar-header-blur-layer" aria-hidden />
      <div
        className={cn(
          "ar-header-content relative flex min-h-[var(--ar-header-height)] w-full items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4",
          "pt-[var(--ar-header-safe-top)] pb-[var(--ar-header-pad-bottom)]"
        )}
      >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <div className="shrink-0 lg:hidden">
          <DashboardMobileDrawerTrigger open={mobileMenuOpen} onOpenChange={onMobileMenuOpenChange} />
        </div>
        <div className="shrink-0">
          <ArFarmhouseLogo size={38} className="shadow-inner dark:shadow-inner dark:shadow-white/5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-[14px] font-semibold leading-tight tracking-tight text-foreground sm:text-base">
            {activeId === "home" ? "AR Farmhouse" : activeMeta.label}
          </p>
          <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{sectionSubtitle[activeId]}</p>
        </div>
      </div>
      <div className="relative flex shrink-0 items-center gap-2">
        {user ? (
          <>
            <NotificationBell />
            <button
              type="button"
              onClick={() => setAccountOpen((o) => !o)}
              className="flex max-w-[min(11rem,42vw)] items-center gap-1.5 rounded-full border border-border/60 bg-card/50 py-1 pl-1 pr-2 text-left transition-colors hover:border-border hover:bg-muted/50 sm:max-w-[220px] sm:gap-2 sm:pr-2.5 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-white/16 dark:hover:bg-white/[0.08]"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
            >
              <Avatar size="default" className="size-8 ring-1 ring-border/60 sm:size-9 dark:ring-white/10">
                <AvatarImage src={avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="text-[10px] sm:text-xs">{displayName.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-foreground sm:text-xs">
                {displayName}
              </span>
            </button>
            {accountOpen ? (
              <OverlayPortal>
                <button
                  type="button"
                  className="fixed inset-0 z-[75] cursor-default bg-transparent"
                  aria-label="Close menu"
                  onClick={() => setAccountOpen(false)}
                />
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={AR_ACCOUNT_MENU}
                  role="menu"
                >
                  <p className="truncate px-3 py-2 text-[11px] text-muted-foreground">{user.email}</p>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06]"
                    onClick={() => {
                      setAccountOpen(false);
                      goTo("profile");
                    }}
                  >
                    <UserRound className="size-4 shrink-0 opacity-80" aria-hidden />
                    Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted/70 dark:hover:bg-white/[0.06]"
                    onClick={() => {
                      setAccountOpen(false);
                      void (async () => {
                        await signOut();
                        router.replace("/login");
                      })();
                    }}
                  >
                    <LogOut className="size-4 shrink-0 opacity-80" aria-hidden />
                    Sign out
                  </button>
                </motion.div>
              </OverlayPortal>
            ) : null}
          </>
        ) : null}
      </div>
      </div>
    </header>
  );
}
