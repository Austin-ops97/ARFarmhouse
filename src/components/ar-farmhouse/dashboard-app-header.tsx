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
import { getSidebarNavForUser, type NavId } from "@/components/ar-farmhouse/dashboard-nav";
import { UserAvatar } from "@/components/ar-farmhouse/user-avatar";
import { useAuth } from "@/contexts/auth-context";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { AR_ACCOUNT_MENU } from "@/lib/mobile-overlay";
import { cn } from "@/lib/utils";

const sectionSubtitle: Record<NavId, string | null> = {
  home: null,
  feed: null,
  calendar: "Bookings",
  guide: "Mena area",
  map: null,
  tasks: null,
  album: null,
  property: null,
  profile: null,
  settings: null,
  admin: "Moderation",
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
  const { user, signOut, displayName, avatarColor, profile } = useAuth();
  const navItems = getSidebarNavForUser(profile);
  const [accountOpen, setAccountOpen] = useState(false);
  const [elevated, setElevated] = useState(false);
  useBodyScrollLock(accountOpen);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    setElevated(y > 10);
  });

  const activeMeta = navItems.find((n) => n.id === activeId) ?? navItems[0];

  return (
    <header
      className={cn(
        "fixed top-0 z-[45] box-border min-h-[var(--ar-header-height)] w-full border-b",
        "left-0 lg:left-[248px] lg:right-0",
        "transition-[background-color,box-shadow,border-color] duration-300 ease-out",
        elevated
          ? "border-border/40 bg-background/85 shadow-[var(--ar-float-subtle)] dark:border-white/[0.08] dark:bg-background/85 dark:shadow-[0_8px_28px_-14px_rgba(0,0,0,0.5)]"
          : "border-border/30 bg-background/72 dark:border-white/[0.05] dark:bg-background/68"
      )}
    >
      <div className="ar-header-blur-layer" aria-hidden />
      <div
        className={cn(
          "ar-header-content relative flex min-h-[var(--ar-header-height)] w-full items-center justify-between gap-3 px-3 sm:gap-3 sm:px-4",
          "pt-[var(--ar-header-safe-top)] pb-[var(--ar-header-pad-bottom)]"
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
        <div className="shrink-0 lg:hidden">
          <DashboardMobileDrawerTrigger open={mobileMenuOpen} onOpenChange={onMobileMenuOpenChange} />
        </div>
        <div className="shrink-0 origin-left scale-[0.9] sm:scale-100">
          <ArFarmhouseLogo size={36} className="shadow-inner dark:shadow-inner dark:shadow-white/5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-base font-semibold leading-snug tracking-tight text-foreground sm:text-base">
            {activeId === "home"
              ? "AR Farmhouse"
              : activeId === "feed" ? (
                  <>
                    <span className="sm:hidden">AR Farmhouse</span>
                    <span className="hidden sm:inline">{activeMeta.label}</span>
                  </>
                ) : (
                  activeMeta.label
                )}
          </p>
          {sectionSubtitle[activeId] ? (
            <p className="line-clamp-1 text-xs leading-snug text-muted-foreground sm:text-xs">
              {sectionSubtitle[activeId]}
            </p>
          ) : null}
        </div>
      </div>
      <div className="relative flex shrink-0 items-center gap-1.5 sm:gap-2">
        {user ? (
          <>
            <NotificationBell />
            <button
              type="button"
              onClick={() => setAccountOpen((o) => !o)}
              className="ar-touch-press flex max-w-[min(11rem,42vw)] min-h-11 items-center gap-1.5 rounded-full border border-border/45 bg-card/40 py-1 pl-1 pr-2 text-left transition-colors hover:border-border/60 hover:bg-muted/45 sm:max-w-[220px] sm:min-h-0 sm:gap-2 sm:py-1 sm:pl-1 sm:pr-2.5 dark:border-white/[0.08] dark:bg-white/[0.035] dark:hover:border-white/12 dark:hover:bg-white/[0.06]"
              aria-expanded={accountOpen}
              aria-haspopup="menu"
            >
              <UserAvatar
                name={displayName}
                colorId={avatarColor}
                uid={user.uid}
                size="default"
                className="size-8 ring-1 ring-border/60 sm:size-9 dark:ring-white/10"
                fallbackClassName="text-xs"
              />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground sm:text-xs">
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
                  initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduceMotion ? 0.14 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className={AR_ACCOUNT_MENU}
                  role="menu"
                >
                  <p className="truncate px-3 py-2 text-xs text-muted-foreground sm:text-[11px]">{user.email}</p>
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
