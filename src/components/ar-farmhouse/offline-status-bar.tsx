"use client";

import { WifiOff } from "lucide-react";

import { useOfflineStore } from "@/platform/state/offline-store";
import { cn } from "@/lib/utils";

export function OfflineStatusBar({ className }: { className?: string }) {
  const online = useOfflineStore((s) => s.online);
  const pending = useOfflineStore((s) => s.pendingMutations);

  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 border-b border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-950 dark:text-amber-100",
        className
      )}
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden />
      {!online
        ? "You are offline — showing cached data. Changes will sync when reconnected."
        : `${pending} pending ${pending === 1 ? "change" : "changes"} syncing…`}
    </div>
  );
}
