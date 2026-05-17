"use client";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePushNotificationsContext } from "@/contexts/push-notifications-context";
import { readVapidKey } from "@/lib/firebase/messaging";
import { pushSupportedInThisContext } from "@/lib/push/platform";
import { cn } from "@/lib/utils";

type NotificationPermissionPromptProps = {
  className?: string;
};

/**
 * Push permission UI for settings — user must tap Enable (never auto-prompts on mount).
 */
export function NotificationPermissionPrompt({ className }: NotificationPermissionPromptProps) {
  const {
    supported,
    permission,
    registering,
    error,
    requestPermissionAndRegister,
  } = usePushNotificationsContext();

  if (!readVapidKey()) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Push is not configured yet. Add <code className="text-[11px]">NEXT_PUBLIC_FIREBASE_VAPID_KEY</code> to
        your environment (see Firebase Console → Cloud Messaging → Web Push certificates).
      </p>
    );
  }

  if (!supported || !pushSupportedInThisContext()) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Push is not available in this browser. On iPhone, add the app to your Home Screen first.
      </p>
    );
  }

  if (permission === "granted") {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Push notifications are enabled for this device.
      </p>
    );
  }

  if (permission === "denied") {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        Notifications are blocked in your browser settings. Enable them there to receive alerts.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-3 dark:border-white/8 dark:bg-white/[0.04]">
        <Bell className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Get booking updates and family announcements even when the app is in the background.
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        className="h-9 rounded-lg"
        disabled={registering}
        onClick={() => void requestPermissionAndRegister()}
      >
        {registering ? "Enabling…" : "Enable notifications"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
