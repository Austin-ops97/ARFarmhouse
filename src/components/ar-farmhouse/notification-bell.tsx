"use client";

import { Bell } from "lucide-react";

import { NotificationCenterSheet } from "@/components/ar-farmhouse/notification-center-sheet";
import { useNotifications } from "@/contexts/notifications-context";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "relative flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card/50 transition-colors",
          "hover:border-border hover:bg-muted/50 sm:size-10 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
        )}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
      >
        <Bell className="size-[18px] text-foreground/90" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationCenterSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
