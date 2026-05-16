"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Check, Loader2, Shield, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { BookingModerationDialog } from "@/components/ar-farmhouse/booking-moderation-dialog";
import { Button } from "@/components/ui/button";
import { ActionToastBanner } from "@/components/ui/action-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useActionToast } from "@/hooks/use-action-toast";
import { statusBadgeLabel } from "@/lib/booking-status-styles";
import { canApproveBookings } from "@/lib/permissions";
import { runMutation } from "@/lib/mutation-lifecycle";
import type { Booking } from "@/models/booking";
import { filterBookingsForAdmin } from "@/lib/calendar-filters";
import { Input } from "@/components/ui/input";
import {
  approveBooking,
  denyBooking,
  softDeleteBooking,
} from "@/services/booking-mutations";
import { subscribePendingBookings } from "@/services/bookings";
import { cn } from "@/lib/utils";

function formatBookingRange(b: Booking): string {
  const start = b.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const end = b.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (start === end) return start;
  return `${start} – ${end}`;
}

type ModerationTarget = { booking: Booking; mode: "deny" | "delete" };

export function AdminModerationView({ embedded = false }: { embedded?: boolean }) {
  const reduceMotion = useReducedMotion();
  const { user, profile, displayName } = useAuth();
  const { toast, showToast } = useActionToast();
  const [pending, setPending] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [moderationTarget, setModerationTarget] = useState<ModerationTarget | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [conflictsOnly, setConflictsOnly] = useState(false);

  const filtered = filterBookingsForAdmin(pending, {
    searchQuery,
    showConflictsOnly: conflictsOnly,
  });

  const canModerate = canApproveBookings(profile);

  useEffect(() => {
    if (!canModerate) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribePendingBookings(
      (rows) => {
        setPending(rows);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [canModerate]);

  const runAction = useCallback(
    async (bookingId: string, label: string, fn: () => Promise<void>, successMsg: string) => {
      if (!user || actingId) return;
      await runMutation("booking", label, fn, {
        onStart: () => setActingId(bookingId),
        onSuccess: () => showToast(successMsg, "success"),
        onError: (e) =>
          showToast(e instanceof Error ? e.message : "Action failed.", "error"),
        onFinally: () => setActingId(null),
      });
    },
    [actingId, showToast, user]
  );

  const confirmModeration = () => {
    if (!moderationTarget || !user) return;
    const { booking, mode } = moderationTarget;
    const reason = moderationReason;
    void runAction(
      booking.id,
      mode,
      () =>
        mode === "deny"
          ? denyBooking(booking.id, actor!, reason)
          : softDeleteBooking(booking.id, actor!, reason),
      mode === "deny" ? "Request denied." : "Booking deleted."
    ).then(() => {
      setModerationTarget(null);
      setModerationReason("");
    });
  };

  if (!canModerate) {
    return (
      <section className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-muted-foreground">
        Admin access is required to moderate bookings.
      </section>
    );
  }

  const actor = user
    ? { uid: user.uid, displayName: displayName || "Admin", avatarUrl: null }
    : null;

  return (
    <motion.div
      layout={!reduceMotion}
      className={cn(
        "min-w-0 space-y-6",
        embedded ? "px-4 py-6 sm:px-6" : "mx-auto max-w-2xl px-4 py-6 sm:px-6"
      )}
    >
      <header className="space-y-2">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground dark:border-white/10"
        >
          <Shield className="size-3.5 text-primary" aria-hidden />
          Admin · Moderation
        </motion.div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Pending requests</h1>
        <p className="text-sm text-muted-foreground">
          Approve or decline booking and event requests. Conflict-flagged items overlap an approved stay.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title or guest…"
          className="min-h-11 flex-1 rounded-xl"
        />
        <button
          type="button"
          onClick={() => setConflictsOnly((v) => !v)}
          className={cn(
            "min-h-11 shrink-0 rounded-xl border px-4 text-xs font-medium transition-colors",
            conflictsOnly
              ? "border-amber-400/35 bg-amber-500/15 text-amber-100"
              : "border-border/50 text-muted-foreground dark:border-white/10"
          )}
        >
          Conflicts only
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/95">
          {error}
        </p>
      )}

      {loading ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl bg-white/[0.06]" />
          ))}
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/50 bg-card/60 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.03]"
        >
          <p className="font-medium text-foreground">
            {pending.length === 0 ? "No pending requests" : "No matches"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {pending.length === 0
              ? "New submissions will appear here in real time."
              : "Try adjusting your search or filters."}
          </p>
        </motion.div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((b) => {
              const busy = actingId === b.id;
              return (
                <motion.li
                  key={b.id}
                  layout={!reduceMotion}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                  className="rounded-2xl border border-border/55 bg-card/80 p-4 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <motion.div layout={!reduceMotion} className="flex flex-wrap items-start justify-between gap-2">
                    <motion.div layout={!reduceMotion} className="min-w-0 space-y-1">
                      <p className="font-medium text-foreground">{b.title}</p>
                      <p className="text-[12px] text-muted-foreground">
                        {b.createdByName} · {formatBookingRange(b)}
                      </p>
                      <motion.div layout={!reduceMotion} className="flex flex-wrap gap-2 pt-1">
                        <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {b.type === "event" ? "Event" : "Booking"}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium",
                            b.status === "pending_conflict"
                              ? "border border-amber-400/30 bg-amber-500/15 text-amber-100"
                              : "border border-white/10 bg-white/[0.05] text-muted-foreground"
                          )}
                        >
                          {statusBadgeLabel(b.status, b.type)}
                        </span>
                      </motion.div>
                    </motion.div>
                  </motion.div>

                  {b.description && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{b.description}</p>
                  )}

                  {b.status === "pending_conflict" && b.conflictsWith.length > 0 && (
                    <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-50/95">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                      Overlaps approved booking{b.conflictsWith.length > 1 ? "s" : ""}. Review before approving.
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-10 flex-1 rounded-xl sm:flex-none"
                      disabled={busy || !user}
                      onClick={() =>
                        void runAction(
                          b.id,
                          "approve",
                          () => approveBooking(b.id, actor!),
                          "Approved."
                        )
                      }
                    >
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" data-icon="inline-start" />}
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-10 flex-1 rounded-xl sm:flex-none"
                      disabled={busy}
                      onClick={() => {
                        setModerationTarget({ booking: b, mode: "deny" });
                        setModerationReason("");
                      }}
                    >
                      <X className="size-4" data-icon="inline-start" />
                      Deny
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="min-h-10 rounded-xl"
                      disabled={busy || !user}
                      onClick={() => {
                        setModerationTarget({ booking: b, mode: "delete" });
                        setModerationReason("");
                      }}
                    >
                      <Trash2 className="size-4" data-icon="inline-start" />
                      Delete
                    </Button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      {moderationTarget && (
        <BookingModerationDialog
          open
          variant={moderationTarget.mode}
          bookingTitle={moderationTarget.booking.title}
          reason={moderationReason}
          onReasonChange={setModerationReason}
          onClose={() => !actingId && setModerationTarget(null)}
          onConfirm={confirmModeration}
          busy={!!actingId}
        />
      )}

      <ActionToastBanner toast={toast} />
    </motion.div>
  );
}
