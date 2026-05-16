"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CalendarRange,
  Check,
  Loader2,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { BookingModerationDialog } from "@/components/ar-farmhouse/booking-moderation-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionToastBanner } from "@/components/ui/action-toast";
import { useAuth } from "@/contexts/auth-context";
import { useActionToast } from "@/hooks/use-action-toast";
import { OverlayPortal } from "@/components/ar-farmhouse/overlay-portal";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { AR_BOTTOM_SHEET_HOST, AR_MOBILE_SHEET, AR_OVERLAY_SCRIM } from "@/lib/mobile-overlay";
import { cn } from "@/lib/utils";
import { activityLabel } from "@/lib/booking-activity";
import { formatBookingDateRange } from "@/lib/booking-dates";
import { formatLocalDateTime } from "@/lib/datetime/time";
import { statusBadgeLabel } from "@/lib/booking-status-styles";
import { runMutation } from "@/lib/mutation-lifecycle";
import {
  canAdminDeleteBooking,
  canApproveBookings,
  canRemoveOwnBooking,
  isBookingOwner,
} from "@/lib/permissions";
import type { Booking } from "@/models/booking";
import {
  approveBooking,
  cancelBooking,
  denyBooking,
  softDeleteBooking,
} from "@/services/booking-mutations";
import { fetchBookingById } from "@/services/bookings";

type BookingDetailSheetProps = {
  bookingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ModerationMode = "deny" | "delete" | null;

export function BookingDetailSheet({ bookingId, open, onOpenChange }: BookingDetailSheetProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const { user, profile, displayName } = useAuth();
  const { toast, showToast } = useActionToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [moderationMode, setModerationMode] = useState<ModerationMode>(null);
  const [moderationReason, setModerationReason] = useState("");

  useBodyScrollLock(open);

  const load = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const row = await fetchBookingById(bookingId);
      if (!row || row.deleted) {
        setBooking(null);
        setError("This booking is no longer available.");
      } else {
        setBooking(row);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load booking.");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!open || !bookingId) {
      setBooking(null);
      setError(null);
      setModerationMode(null);
      setModerationReason("");
      return;
    }
    void load();
  }, [open, bookingId, load]);

  const close = () => onOpenChange(false);

  const actor = user
    ? { uid: user.uid, displayName: displayName || "Member", avatarUrl: null }
    : null;

  const runAction = async (
    label: string,
    fn: () => Promise<void>,
    success: string,
    options?: { closeOnSuccess?: boolean }
  ) => {
    if (!actor || acting) return;
    await runMutation("booking", label, fn, {
      onStart: () => setActing(true),
      onSuccess: () => {
        showToast(success, "success");
        if (options?.closeOnSuccess) close();
        else void load();
      },
      onError: (e) => showToast(e instanceof Error ? e.message : "Action failed.", "error"),
      onFinally: () => setActing(false),
    });
  };

  const openModeration = (mode: ModerationMode) => {
    setModerationMode(mode);
    setModerationReason("");
  };

  const confirmModeration = () => {
    if (!booking || !actor || !moderationMode) return;
    const mode = moderationMode;
    const reason = moderationReason;
    void runAction(
      mode,
      () =>
        mode === "deny"
          ? denyBooking(booking.id, actor, reason)
          : softDeleteBooking(booking.id, actor, reason),
      mode === "deny" ? "Booking denied." : "Booking deleted.",
      { closeOnSuccess: true }
    ).then(() => {
      setModerationMode(null);
      setModerationReason("");
    });
  };

  const isOwner = booking && profile ? isBookingOwner(profile, booking) : false;
  const canModerate = canApproveBookings(profile);
  const canAdminDelete = canAdminDeleteBooking(profile);
  const canCancel =
    booking &&
    user &&
    (isOwner || canModerate) &&
    (booking.status === "pending" ||
      booking.status === "pending_conflict" ||
      booking.status === "approved");
  const canRemoveOwn = booking && profile && canRemoveOwnBooking(profile, booking) && !canAdminDelete;

  return (
    <>
      <AnimatePresence>
        {open && bookingId && (
          <OverlayPortal>
          <motion.div
            className={cn(AR_BOTTOM_SHEET_HOST, "z-[70]")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button type="button" className={AR_OVERLAY_SCRIM} aria-label="Close" onClick={close} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={reduceMotion ? false : { y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduceMotion ? undefined : { y: 32, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              className={cn(AR_MOBILE_SHEET, "sm:max-h-[min(90dvh,760px)]")}
            >
              <motion.div layout={!reduceMotion} className="flex items-center justify-between gap-3 border-b border-border/45 px-5 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-white/10">
                <p id={titleId} className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  Booking details
                </p>
                <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close">
                  <X className="size-4" />
                </Button>
              </motion.div>

              <motion.div layout={!reduceMotion} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                {loading && (
                  <motion.div layout={!reduceMotion} className="flex items-center justify-center py-16 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin" aria-hidden />
                  </motion.div>
                )}
                {error && !loading && (
                  <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/95">
                    {error}
                  </p>
                )}
                {!loading && !error && !booking && (
                  <EmptyState
                    icon={CalendarRange}
                    title="Booking not found"
                    description="It may have been removed or you may not have access."
                  />
                )}
                {booking && (
                  <motion.div layout={!reduceMotion} className="space-y-5">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-primary/90">
                        {booking.type === "event" ? "Event" : "Booking"} ·{" "}
                        {statusBadgeLabel(booking.status, booking.type)}
                      </p>
                      <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">{booking.title}</h2>
                    </div>

                    <motion.div layout={!reduceMotion} className="grid gap-3 rounded-2xl border border-border/50 bg-muted/20 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                      <DetailRow icon={CalendarRange} label="Dates">
                        {formatBookingDateRange(booking.startDate, booking.endDate)}
                      </DetailRow>
                      <DetailRow icon={User} label="Submitted by">
                        {booking.createdByName}
                      </DetailRow>
                      {booking.approvedAt && booking.status === "approved" && (
                        <DetailRow icon={Check} label="Approved">
                          {booking.approvedAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </DetailRow>
                      )}
                      {booking.deniedReason && booking.status === "denied" && (
                        <DetailRow icon={X} label="Reason">
                          {booking.deniedReason}
                        </DetailRow>
                      )}
                    </motion.div>

                    {booking.description?.trim() && (
                      <section>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                        <p className="mt-2 text-sm leading-relaxed text-foreground/90">{booking.description}</p>
                      </section>
                    )}

                    {booking.status === "pending_conflict" && booking.conflictsWith.length > 0 && (
                      <p className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-50/95">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                        Overlaps {booking.conflictsWith.length} approved booking
                        {booking.conflictsWith.length === 1 ? "" : "s"}. Admin review recommended.
                      </p>
                    )}

                    {booking.activityLog.length > 0 && (
                      <section>
                        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Activity
                        </p>
                        <ol className="space-y-0 border-l border-border/50 pl-4 dark:border-white/10">
                          {[...booking.activityLog].reverse().map((entry, i) => (
                            <li key={`${entry.action}-${entry.timestamp.getTime()}-${i}`} className="relative pb-4 last:pb-0">
                              <span className="absolute -left-[1.125rem] top-1.5 size-2 rounded-full bg-primary/70 ring-2 ring-background" />
                              <p className="text-sm font-medium text-foreground">{activityLabel(entry.action)}</p>
                              <p className="text-xs text-muted-foreground">
                                {entry.byUserName} · {formatLocalDateTime(entry.timestamp)}
                              </p>
                              {entry.details ? (
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.details}</p>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                      </section>
                    )}

                    <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
                      {canModerate && (booking.status === "pending" || booking.status === "pending_conflict") && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            className="min-h-11 flex-1 rounded-xl"
                            disabled={acting || !actor}
                            onClick={() =>
                              void runAction("approve", () => approveBooking(booking.id, actor!), "Approved.")
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-11 flex-1 rounded-xl"
                            disabled={acting || !actor}
                            onClick={() => openModeration("deny")}
                          >
                            Deny booking
                          </Button>
                        </>
                      )}
                      {canCancel && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-h-11 rounded-xl"
                          disabled={acting || !actor}
                          onClick={() =>
                            void runAction(
                              "cancel",
                              () => cancelBooking(booking.id, actor!),
                              "Cancelled.",
                              { closeOnSuccess: true }
                            )
                          }
                        >
                          Cancel booking
                        </Button>
                      )}
                      {canAdminDelete && (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="min-h-11 rounded-xl"
                          disabled={acting || !actor}
                          onClick={() => openModeration("delete")}
                        >
                          <Trash2 className="size-4" data-icon="inline-start" />
                          Delete booking
                        </Button>
                      )}
                      {canRemoveOwn && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="min-h-11 rounded-xl text-muted-foreground"
                          disabled={acting || !actor}
                          onClick={() =>
                            void runAction(
                              "remove",
                              () => softDeleteBooking(booking.id, actor!),
                              "Booking removed.",
                              { closeOnSuccess: true }
                            )
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
              <ActionToastBanner toast={toast} />
            </motion.div>
          </motion.div>
          </OverlayPortal>
        )}
      </AnimatePresence>

      {booking && moderationMode && (
        <BookingModerationDialog
          open
          variant={moderationMode}
          bookingTitle={booking.title}
          reason={moderationReason}
          onReasonChange={setModerationReason}
          onClose={() => !acting && setModerationMode(null)}
          onConfirm={confirmModeration}
          busy={acting}
        />
      )}
    </>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarRange;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary/80" aria-hidden />
      <motion.div layout className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-medium text-foreground">{children}</p>
      </motion.div>
    </div>
  );
}
