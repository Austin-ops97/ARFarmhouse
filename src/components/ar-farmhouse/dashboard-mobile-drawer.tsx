"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef } from "react";

import { ArFarmhouseLogo } from "@/components/ar-farmhouse/ar-farmhouse-logo";
import { UserAvatar } from "@/components/ar-farmhouse/user-avatar";
import { useAuth } from "@/contexts/auth-context";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { cn } from "@/lib/utils";

import { getSidebarNavForUser, mobileDrawerLabel, type NavId } from "./dashboard-nav";

type DashboardMobileDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeId: NavId;
  onSelect: (id: NavId) => void;
};

export function DashboardMobileDrawerTrigger({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={() => onOpenChange(!open)}
      aria-expanded={open}
      aria-controls="ar-mobile-nav-drawer"
      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/45 bg-card/55 text-foreground shadow-[var(--ar-float-subtle)]",
        "touch-manipulation transition-colors hover:bg-muted/70 dark:border-white/[0.08] dark:bg-white/[0.035] dark:hover:bg-white/[0.06]"
      )}
      aria-label={open ? "Close menu" : "Open menu"}
    >
      {open ? <X className="size-[22px]" strokeWidth={2} aria-hidden /> : <Menu className="size-[22px]" strokeWidth={2} aria-hidden />}
    </motion.button>
  );
}

export function DashboardMobileDrawer({ open, onOpenChange, activeId, onSelect }: DashboardMobileDrawerProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const { displayName, avatarColor, user, profile } = useAuth();
  const navItems = getSidebarNavForUser(profile);

  useBodyScrollLock(open);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const pick = useCallback(
    (id: NavId) => {
      onSelect(id);
      onOpenChange(false);
    },
    [onSelect, onOpenChange]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const activeBtn = panelRef.current?.querySelector<HTMLElement>(`button[data-nav-active="true"]`);
      (activeBtn ?? panelRef.current?.querySelector<HTMLElement>("button"))?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, [open, activeId]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[48] lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="ar-scrim absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
            onClick={close}
          />

          <motion.aside
            ref={panelRef}
            id="ar-mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { x: "-104%" }}
            animate={{ x: 0 }}
            exit={reduceMotion ? undefined : { x: "-104%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.65 }}
            className={cn(
              "ar-header-blur absolute inset-y-0 left-0 flex w-[min(20.5rem,calc(100vw-1.25rem))] max-w-[100vw] flex-col",
              "border-r border-border/60 bg-sidebar/94 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pt-[max(0.75rem,env(safe-area-inset-top))] pr-3 shadow-[var(--ar-modal-elevate)] dark:border-white/10 dark:bg-sidebar/92"
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-4 dark:border-white/10">
              <div className="flex min-w-0 items-center gap-3">
                <ArFarmhouseLogo size={40} className="shadow-[var(--ar-float-elevate)] dark:shadow-inner dark:shadow-white/5" />
                <div className="min-w-0">
                  <p id={titleId} className="font-heading text-base font-semibold tracking-tight text-foreground">
                    AR Farmhouse
                  </p>
                </div>
              </div>
              <motion.button
                type="button"
                onClick={close}
                whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                aria-label="Close menu"
              >
                <X className="size-[18px]" aria-hidden />
              </motion.button>
            </div>

            <motion.div className="ar-surface-float mt-4 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={displayName}
                  colorId={avatarColor}
                  uid={user?.uid}
                  size="lg"
                  className="ring-2 ring-background/80"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="truncate text-sm text-muted-foreground md:text-xs">{user?.email ?? "Signed in"}</p>
                </div>
              </div>
            </motion.div>

            <nav className="mt-5 flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain pr-1" aria-label="Primary">
              {navItems.map((item, index) => {
                const active = activeId === item.id;
                const Icon = item.icon;
                const label = mobileDrawerLabel[item.id];
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    data-nav-active={active ? "true" : undefined}
                    onClick={() => pick(item.id)}
                    initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reduceMotion ? 0 : index * 0.03, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    className={cn(
                      "group relative flex min-h-[3.5rem] items-center gap-3.5 rounded-2xl px-3.5 py-3 text-left text-base transition-colors touch-manipulation",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground dark:hover:bg-white/[0.05]"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="mobile-drawer-nav-pill"
                        className="absolute inset-0 rounded-2xl border border-primary/25 bg-primary/10"
                        transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                        active
                          ? "border-primary/30 bg-primary/12 text-primary"
                          : "border-transparent bg-muted/45 text-muted-foreground group-hover:text-foreground dark:bg-white/[0.03]"
                      )}
                    >
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="relative z-10 font-medium">{label}</span>
                  </motion.button>
                );
              })}
            </nav>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
