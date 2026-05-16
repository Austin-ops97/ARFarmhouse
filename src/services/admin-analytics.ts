import type { Booking, BookingStatus } from "@/models/booking";

export type AdminDashboardStats = {
  bookings: {
    total: number;
    pending: number;
    pendingConflict: number;
    approved: number;
    denied: number;
    cancelled: number;
    upcomingApproved: number;
  };
  conflicts: {
    openConflictCount: number;
    bookingsWithConflicts: number;
  };
  moderation: {
    queueDepth: number;
  };
  generatedAt: Date;
};

function countByStatus(bookings: readonly Booking[]): Record<BookingStatus, number> {
  const counts: Record<BookingStatus, number> = {
    pending: 0,
    pending_conflict: 0,
    approved: 0,
    denied: 0,
    cancelled: 0,
  };
  for (const b of bookings) {
    if (b.deleted) continue;
    counts[b.status] = (counts[b.status] ?? 0) + 1;
  }
  return counts;
}

export function computeAdminDashboardStats(
  bookings: readonly Booking[],
  opts?: { now?: Date }
): AdminDashboardStats {
  const now = opts?.now ?? new Date();
  const active = bookings.filter((b) => !b.deleted);
  const byStatus = countByStatus(active);

  const upcomingApproved = active.filter(
    (b) =>
      b.status === "approved" &&
      b.endDate.getTime() >= now.getTime()
  ).length;

  const withConflicts = active.filter(
    (b) => b.conflictsWith.length > 0 || b.status === "pending_conflict"
  );

  const openConflictCount = withConflicts.reduce(
    (sum, b) => sum + Math.max(b.conflictsWith.length, b.status === "pending_conflict" ? 1 : 0),
    0
  );

  const queueDepth = byStatus.pending + byStatus.pending_conflict;

  return {
    bookings: {
      total: active.length,
      pending: byStatus.pending,
      pendingConflict: byStatus.pending_conflict,
      approved: byStatus.approved,
      denied: byStatus.denied,
      cancelled: byStatus.cancelled,
      upcomingApproved,
    },
    conflicts: {
      openConflictCount,
      bookingsWithConflicts: withConflicts.length,
    },
    moderation: {
      queueDepth,
    },
    generatedAt: now,
  };
}
