"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/contexts/auth-context";
import { subscribeBookingsForMonth, subscribePendingBookings } from "@/services/bookings";
import { purgeStaleDeniedBookings } from "@/services/booking-mutations";
import {
  computeAdminDashboardStats,
  type AdminDashboardStats,
} from "@/services/admin-analytics";
import type { Booking } from "@/models/booking";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: number | string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "ar-surface-float rounded-2xl border border-border/50 px-4 py-3 dark:border-white/[0.06]",
        emphasis && "border-primary/30 bg-primary/5"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function mergeUniqueBookings(...lists: readonly Booking[][]): Booking[] {
  const map = new Map<string, Booking>();
  for (const list of lists) {
    for (const b of list) map.set(b.id, b);
  }
  return [...map.values()];
}

export function AdminOverviewView({ embedded }: { embedded?: boolean }) {
  const { user, displayName } = useAuth();
  const now = useMemo(() => new Date(), []);
  const [monthBookings, setMonthBookings] = useState<Booking[]>([]);
  const [pending, setPending] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  useEffect(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const unsubMonth = subscribeBookingsForMonth(year, month, (rows) => {
      setMonthBookings(rows);
      setLoading(false);
    });
    const unsubPending = subscribePendingBookings(setPending);
    return () => {
      unsubMonth();
      unsubPending();
    };
  }, [now]);

  const stats: AdminDashboardStats = useMemo(
    () => computeAdminDashboardStats(mergeUniqueBookings(monthBookings, pending)),
    [monthBookings, pending]
  );

  const runDeniedCleanup = useCallback(async () => {
    if (!user || cleanupBusy) return;
    setCleanupBusy(true);
    setCleanupMessage(null);
    try {
      const result = await purgeStaleDeniedBookings({
        uid: user.uid,
        displayName: displayName || "Admin",
        avatarUrl: null,
      });
      if (result.removed === 0 && result.errors.length === 0) {
        setCleanupMessage("No stale denied bookings found.");
      } else if (result.errors.length > 0) {
        setCleanupMessage(
          `Removed ${result.removed} of ${result.scanned}. ${result.errors.length} error(s) — check console.`
        );
      } else {
        setCleanupMessage(`Removed ${result.removed} stale denied booking${result.removed === 1 ? "" : "s"}.`);
      }
    } catch (e) {
      setCleanupMessage(e instanceof Error ? e.message : "Cleanup failed.");
    } finally {
      setCleanupBusy(false);
    }
  }, [cleanupBusy, displayName, user]);

  if (loading) {
    return (
      <div className={cn("px-4 py-8 sm:px-6", embedded && "pt-4")}>
        <p className="text-sm text-muted-foreground">Loading overview…</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6 px-4 py-6 sm:px-6", embedded && "pt-2")}>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Platform overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Booking and moderation metrics for operational visibility.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Moderation queue"
          value={stats.moderation.queueDepth}
          hint="Pending + conflict"
          emphasis={stats.moderation.queueDepth > 0}
        />
        <StatCard label="Upcoming stays" value={stats.bookings.upcomingApproved} />
        <StatCard label="Active bookings" value={stats.bookings.total} hint="Pending + approved" />
        <StatCard label="Approved" value={stats.bookings.approved} />
        {stats.bookings.staleDenied > 0 ? (
          <StatCard
            label="Stale denied"
            value={stats.bookings.staleDenied}
            hint="Needs cleanup"
            emphasis
          />
        ) : null}
        <StatCard label="Cancelled" value={stats.bookings.cancelled} />
      </div>

      {stats.bookings.staleDenied > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/5 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            {stats.bookings.staleDenied} denied booking
            {stats.bookings.staleDenied === 1 ? "" : "s"} still in active data — remove them so calendar and hub stay accurate.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 rounded-xl"
            disabled={cleanupBusy}
            onClick={() => void runDeniedCleanup()}
          >
            {cleanupBusy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Clean up denied
          </Button>
        </div>
      ) : null}

      {cleanupMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {cleanupMessage}
        </p>
      ) : null}

      {stats.conflicts.bookingsWithConflicts > 0 ? (
        <div className="ar-surface-float rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <p className="text-sm font-medium text-foreground">Scheduling conflicts</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.conflicts.bookingsWithConflicts} booking
            {stats.conflicts.bookingsWithConflicts === 1 ? "" : "s"} with overlap flags — review in
            Moderation.
          </p>
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title="No open conflicts"
          description="Approved calendar stays are clear of flagged overlaps."
        />
      )}

      <p className="text-xs text-muted-foreground">
        Snapshot generated {stats.generatedAt.toLocaleString()}
      </p>
    </div>
  );
}
