"use client";

import { AlertTriangle, WifiOff } from "lucide-react";

import { useNetworkStatus } from "@/hooks/use-network-status";
import { cn } from "@/lib/utils";

type SyncStatusBannerProps = {
  error?: string | null;
  className?: string;
};

/** Surfaces sync failures and offline state without blocking the whole view. */
export function SyncStatusBanner({ error, className }: SyncStatusBannerProps) {
  const { offline } = useNetworkStatus();

  if (!offline && !error) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-sm",
        offline
          ? "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:text-amber-100"
          : "border-destructive/35 bg-destructive/10 text-destructive",
        className
      )}
    >
      {offline ? (
        <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      )}
      <p className="leading-snug">
        {offline
          ? "You appear to be offline. Changes will sync when your connection returns."
          : error}
      </p>
    </div>
  );
}
