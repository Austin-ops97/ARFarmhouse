"use client";

import { useEffect, useMemo, useState } from "react";

import { CheckCircle2 } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { subscribeBookingsForMonth, subscribePendingBookings } from "@/services/bookings";
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
  const now = useMemo(() => new Date(), []);
  const [monthBookings, setMonthBookings] = useState<Booking[]>([]);
  const [pending, setPending] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

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
        <StatCard label="Total bookings" value={stats.bookings.total} />
        <StatCard label="Approved" value={stats.bookings.approved} />
        <StatCard label="Denied" value={stats.bookings.denied} />
        <StatCard label="Cancelled" value={stats.bookings.cancelled} />
      </div>

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
