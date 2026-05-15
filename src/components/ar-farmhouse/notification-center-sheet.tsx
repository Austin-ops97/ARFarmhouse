"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell, CheckCheck, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/contexts/notifications-context";
import { useNotificationNavigation } from "@/hooks/use-notification-navigation";
import { OverlayPortal } from "@/components/ar-farmhouse/overlay-portal";
import { SyncStatusBanner } from "@/components/ar-farmhouse/sync-status-banner";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { groupNotificationsByDay } from "@/lib/activity-coordination";
import {
  AR_OVERLAY_HOST,
  AR_OVERLAY_SCRIM,
  AR_SIDE_PANEL_SHEET,
  AR_SHEET_BODY,
  AR_SHEET_HEADER,
} from "@/lib/mobile-overlay";
import { cn } from "@/lib/utils";

type NotificationCenterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NotificationCenterSheet({ open, onOpenChange }: NotificationCenterSheetProps) {
  const reduceMotion = useReducedMotion();
  const { notifications, unreadCount, loading, syncError, markRead, markAllRead, dismiss } =
    useNotifications();
  const navigate = useNotificationNavigation();
  const groups = groupNotificationsByDay(notifications);

  useBodyScrollLock(open);

  const handleOpen = async (id: string) => {
    const n = notifications.find((row) => row.id === id);
    if (!n) return;
    if (!n.readAt) await markRead(id);
    onOpenChange(false);
    navigate(n);
  };

  return (
    <OverlayPortal>
    <AnimatePresence>
      {open ? (
        <motion.div
          className={cn(AR_OVERLAY_HOST, "z-[75] sm:items-stretch sm:justify-end")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className={AR_OVERLAY_SCRIM}
            aria-label="Close notifications"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Family activity"
            initial={reduceMotion ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={AR_SIDE_PANEL_SHEET}
          >
            <div className={cn(AR_SHEET_HEADER, "flex items-center justify-between gap-3")}>
              <div>
                <p className="font-heading text-base font-semibold text-foreground">Family activity</p>
                <p className="text-[11px] text-muted-foreground">Stay connected with property updates</p>
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-xs"
                    onClick={() => void markAllRead()}
                  >
                    <CheckCheck className="size-4" data-icon="inline-start" aria-hidden />
                    Mark all read
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex size-9 items-center justify-center rounded-full border border-border/60"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className={cn(AR_SHEET_BODY, "px-3 py-3")}>
              {syncError && (
                <SyncStatusBanner error={syncError} className="mb-3" />
              )}
              {loading && (
                <p className="py-12 text-center text-sm text-muted-foreground">Loading activity…</p>
              )}
              {!loading && !syncError && notifications.length === 0 && (
                <div className="px-4 py-14 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border/55 bg-muted/40">
                    <Bell className="size-5 text-primary" aria-hidden />
                  </div>
                  <p className="mt-5 font-heading text-lg font-semibold text-foreground">
                    Family activity will appear here
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Bookings, comments, and trip updates will surface here — calm, intentional, never noisy.
                  </p>
                </div>
              )}
              {groups.map((group) => (
                <section key={group.label} className="mb-5">
                  <p className="sticky top-0 z-10 bg-background/90 px-1 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-md">
                    {group.label}
                  </p>
                  <ul className="space-y-2">
                    {group.items.map((n) => (
                      <li key={n.id}>
                        <div
                          className={cn(
                            "flex w-full gap-2 rounded-2xl border text-left transition-colors",
                            n.readAt
                              ? "border-border/40 bg-card/30 dark:border-white/[0.06]"
                              : "border-primary/25 bg-primary/[0.06]"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => void handleOpen(n.id)}
                            className="flex min-w-0 flex-1 gap-3 px-3 py-3"
                          >
                            <Avatar size="default" className="size-10 shrink-0">
                              <AvatarImage src={n.actorAvatarUrl ?? undefined} alt="" />
                              <AvatarFallback className="text-[10px]">
                                {n.actorDisplayName.slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-snug text-foreground">{n.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{n.body}</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => void dismiss(n.id)}
                            className="shrink-0 self-start rounded-lg p-3 pr-3.5 text-muted-foreground hover:bg-muted/60"
                            aria-label="Dismiss"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
    </OverlayPortal>
  );
}
