"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarRange, Home, Loader2, Minus, PartyPopper, Plus, Sparkles, Users, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, startTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dayOccupancyHeat } from "@/lib/calendar-event-merge";
import { buildCalendarMonthMeta } from "@/lib/calendar-month-meta";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import { BookingAttendeePicker } from "@/components/ar-farmhouse/booking-attendee-picker";
import { useAuth } from "@/contexts/auth-context";
import { runMutation } from "@/lib/mutation-lifecycle";
import {
  buildAttendeeLabels,
  countBookingGuests,
  type BookingAttendeeSelection,
} from "@/models/family-profile";
import {
  BLACKOUT_BLOCK_MESSAGE,
  resolveBookingCreateConflict,
} from "@/lib/booking-conflict-engine";
import { calendarDayRangeToDates } from "@/lib/booking-dates";
import type { BlackoutDate, Booking, BookingType } from "@/models/booking";
import { createBooking } from "@/services/booking-mutations";
import { ActionToastBanner } from "@/components/ui/action-toast";
import { useActionToast } from "@/hooks/use-action-toast";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { cn } from "@/lib/utils";

const TRIP_TYPES = [
  { id: "family", label: "Family", hint: "Whole-house rhythm" },
  { id: "friends", label: "Friends", hint: "Shared spaces, flexible rooms" },
  { id: "maintenance", label: "Maintenance", hint: "Contractors or project days" },
  { id: "slow", label: "Slow reset", hint: "Low headcount, long evenings" },
] as const;

const ROOM_OPTIONS = [
  { id: "main", label: "Main house", beds: "Primary gathering spaces", available: true },
  { id: "guest", label: "Guest suite", beds: "Private entrance when available", available: true },
  { id: "barn", label: "Barn apartment", beds: "Optional overflow", available: true },
] as const;

type CalendarBookingSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewDate?: Date;
  existingEvents?: PropertyCalendarEvent[];
  blackoutDates?: BlackoutDate[];
  monthBookings?: Booking[];
  initialStartDay?: number;
  initialEndDay?: number;
};

export function CalendarBookingSheet({
  open,
  onOpenChange,
  viewDate,
  existingEvents = [],
  blackoutDates = [],
  monthBookings = [],
  initialStartDay,
  initialEndDay,
}: CalendarBookingSheetProps) {
  const { toast, showToast } = useActionToast();
  const reduceMotion = useReducedMotion();
  useBodyScrollLock(open);
  const titleId = useId();
  const { user, profile, displayName, avatarUrl, loading: authLoading, configured } = useAuth();
  const submitEpochRef = useRef(0);
  const calendarMonth = useMemo(
    () => buildCalendarMonthMeta(viewDate ?? new Date()),
    [viewDate]
  );
  const [recordType, setRecordType] = useState<BookingType>("booking");
  const [tripId, setTripId] = useState<string>(TRIP_TYPES[0].id);
  const [guests, setGuests] = useState(4);
  const [attendees, setAttendees] = useState<BookingAttendeeSelection>({
    includeSelf: true,
    memberIds: [],
    petIds: [],
  });
  const [roomId, setRoomId] = useState<string>(ROOM_OPTIONS[0].id);
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(1);
  const [notes, setNotes] = useState("");
  const [tripPurpose, setTripPurpose] = useState("");
  const [tripTitle, setTripTitle] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (submitting) return;
    onOpenChange(false);
  }, [onOpenChange, submitting]);

  useEffect(() => {
    if (open) return;
    submitEpochRef.current += 1;
    queueMicrotask(() => {
      setSubmitted(false);
      setSubmitting(false);
      setSubmitError(null);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initialStartDay) {
      setStartDay(initialStartDay);
      setEndDay(initialEndDay ?? initialStartDay);
    }
  }, [open, initialStartDay, initialEndDay]);

  useEffect(() => {
    if (!profile) return;
    setAttendees({ includeSelf: true, memberIds: [], petIds: [] });
  }, [open, profile?.uid]);

  useEffect(() => {
    if (!profile) return;
    setGuests(countBookingGuests(attendees));
  }, [attendees, profile]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (authLoading || !configured) {
      setSubmitError("Wait until sign-in finishes, then try again.");
      return;
    }
    if (!user) {
      setSubmitError("Sign in to send a booking request.");
      return;
    }
    const lo = Math.min(startDay, endDay);
    const hi = Math.max(startDay, endDay);
    if (lo < 1 || hi > calendarMonth.daysInMonth) {
      setSubmitError(`Choose dates within ${calendarMonth.label}.`);
      return;
    }
    if (profile && !attendees.includeSelf && attendees.memberIds.length === 0) {
      setSubmitError("Select at least one person for this stay.");
      return;
    }
    const { startDate, endDate } = calendarDayRangeToDates(
      calendarMonth.year,
      calendarMonth.monthIndex,
      lo,
      hi
    );
    const conflictResult = resolveBookingCreateConflict(
      blackoutDates,
      monthBookings,
      startDate,
      endDate
    );
    if (conflictResult.blocked) {
      setSubmitError(BLACKOUT_BLOCK_MESSAGE);
      return;
    }

    const guestCount = profile ? countBookingGuests(attendees) : guests;
    const attendeeLabels = profile ? buildAttendeeLabels(profile, attendees) : [];

    const epoch = ++submitEpochRef.current;
    await runMutation(
      "booking",
      "submit",
      () =>
        createBooking({
          type: recordType,
          title: tripTitle.trim() || tripPurpose.trim(),
          description: notes.trim() || tripPurpose.trim(),
          year: calendarMonth.year,
          monthIndex: calendarMonth.monthIndex,
          startDay: lo,
          endDay: hi,
          createdBy: user.uid,
          createdByName: displayName,
          actorAvatarUrl: avatarUrl,
          tripId: recordType === "booking" ? tripId : "event",
          guests: guestCount,
          roomId,
          notes: notes.trim(),
          tripPurpose: tripPurpose.trim(),
          includeSelf: profile ? attendees.includeSelf : true,
          attendeeMemberIds: profile ? attendees.memberIds : [],
          attendeePetIds: profile ? attendees.petIds : [],
          attendeeLabels,
        }),
      {
        onStart: () => {
          setSubmitError(null);
          setSubmitting(true);
        },
        onSuccess: (result) => {
          if (submitEpochRef.current !== epoch) return;
          if (result.status === "pending_conflict") {
            showToast("Submitted with conflict flag — awaiting admin review.", "success");
          } else {
            showToast("Request submitted — pending approval.", "success");
          }
          startTransition(() => setSubmitted(true));
        },
        onError: (e) => {
          if (submitEpochRef.current !== epoch) return;
          setSubmitError(e instanceof Error ? e.message : "Could not send request.");
        },
        onFinally: () => {
          if (submitEpochRef.current !== epoch) return;
          startTransition(() => setSubmitting(false));
        },
      }
    );
  }, [
    authLoading,
    calendarMonth.daysInMonth,
    calendarMonth.label,
    calendarMonth.monthIndex,
    calendarMonth.year,
    configured,
    displayName,
    endDay,
    attendees,
    guests,
    notes,
    profile,
    roomId,
    startDay,
    submitting,
    tripId,
    blackoutDates,
    monthBookings,
    recordType,
    tripPurpose,
    tripTitle,
    user,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const cells = (() => {
    const out: ({ type: "blank" } | { type: "day"; day: number })[] = [];
    for (let i = 0; i < calendarMonth.leadingBlanks; i++) out.push({ type: "blank" });
    for (let d = 1; d <= calendarMonth.daysInMonth; d++) out.push({ type: "day", day: d });
    while (out.length % 7 !== 0) out.push({ type: "blank" });
    return out;
  })();

  const inRange = (d: number) => {
    const lo = Math.min(startDay, endDay);
    const hi = Math.max(startDay, endDay);
    return d >= lo && d <= hi;
  };

  const pickDay = (d: number) => {
    if (startDay === endDay) {
      setEndDay(d);
      return;
    }
    setStartDay(d);
    setEndDay(d);
  };

  const heat = (d: number) =>
    dayOccupancyHeat(d, calendarMonth.year, calendarMonth.monthIndex, existingEvents);

  const arrivalLabel = useMemo(() => {
    const lo = Math.min(startDay, endDay);
    const hi = Math.max(startDay, endDay);
    const monthWord = calendarMonth.label.split(" ")[0] ?? "Month";
    if (lo === hi) return `Arrival & departure · ${monthWord} ${lo}`;
    return `Arrive ${monthWord} ${lo} · Depart ${monthWord} ${hi}`;
  }, [calendarMonth.label, endDay, startDay]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-end sm:justify-center sm:p-4 md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.22 }}
        >
          <button
            type="button"
            className="ar-scrim absolute inset-0"
            aria-label="Close"
            onClick={close}
            disabled={submitting}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { y: 22, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={cn(
              "ar-modal-shell relative z-10 flex max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-bottom,0px)))] w-full max-w-[100vw] min-h-0 flex-col overflow-hidden rounded-t-[1.75rem] touch-manipulation",
              "sm:max-h-[min(92dvh,920px)] sm:max-w-lg md:max-w-xl md:rounded-[1.75rem]"
            )}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/45 px-4 pb-3 pt-3 sm:px-5 sm:pb-4 dark:border-white/10">
              <div>
                <p id={titleId} className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  New request
                </p>
                <p className="text-xs text-muted-foreground">
                  Submissions stay pending until an admin approves them.
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-5">
              {submitted ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 py-10 text-center"
                >
                  <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary">
                    <Sparkles className="size-7" aria-hidden />
                  </span>
                  <p className="font-heading text-xl font-semibold text-foreground">Request submitted</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Your {recordType === "event" ? "event" : "booking"} is on the calendar as pending for {calendarMonth.label}.
                    An admin will review it before dates are fully reserved.
                  </p>
                  <Button type="button" className="rounded-xl" onClick={close}>
                    Done
                  </Button>
                </motion.div>
              ) : (
                <motion.div className="space-y-6">
                  <motion.div layout className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: "booking" as const, label: "Booking", icon: Home },
                        { id: "event" as const, label: "Event", icon: PartyPopper },
                      ] as const
                    ).map((opt) => {
                      const Icon = opt.icon;
                      const active = recordType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setRecordType(opt.id)}
                          className={cn(
                            "flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition-colors touch-manipulation",
                            active
                              ? "border border-primary/35 bg-primary/12 text-foreground"
                              : "ar-nested-well hover:border-border/70 dark:hover:border-white/16"
                          )}
                        >
                          <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                          {opt.label}
                        </button>
                      );
                    })}
                  </motion.div>
                  {recordType === "booking" && (
                  <motion.div layout>
                    <p className="text-xs font-medium text-muted-foreground">Trip type</p>
                    <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                      {TRIP_TYPES.map((t) => {
                        const active = tripId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTripId(t.id)}
                            className={cn(
                              "rounded-2xl px-3 py-3 text-left transition-colors",
                              active
                                ? "border border-primary/35 bg-primary/12 text-foreground"
                                : "ar-nested-well hover:border-border/70 dark:hover:border-white/16"
                            )}
                          >
                            <p className="text-sm font-medium">{t.label}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{t.hint}</p>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                  )}

                  <div>
                    <motion.div layout className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <CalendarRange className="size-3.5" aria-hidden />
                      Dates · {calendarMonth.label}
                    </motion.div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Tap start, then end. Occupancy shading activates when real bookings exist.
                    </p>
                    <div className="mt-3 min-w-0 grid grid-cols-7 gap-px text-center text-[9px] font-medium text-muted-foreground sm:gap-1 sm:text-[10px]">
                      {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
                        <span key={`${w}-${i}`}>{w}</span>
                      ))}
                    </div>
                    <div className="mt-1 grid min-w-0 grid-cols-7 gap-px sm:mt-1.5 sm:gap-1">
                      {cells.map((cell, idx) => {
                        if (cell.type === "blank") {
                          return <div key={`b-${idx}`} className="aspect-square rounded-lg bg-transparent" />;
                        }
                        const d = cell.day;
                        const h = heat(d);
                        const range = inRange(d);
                        return (
                          <motion.button
                            key={d}
                            type="button"
                            whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                            onClick={() => pickDay(d)}
                            className={cn(
                              "relative flex min-h-[2.75rem] min-w-0 flex-col items-center justify-center rounded-md border p-0.5 text-[10px] font-medium transition-colors sm:aspect-square sm:min-h-0 sm:rounded-lg sm:text-[11px]",
                              range
                                ? "border-primary/40 bg-primary/20 text-foreground"
                                : "border-border/50 bg-muted/50 text-foreground hover:border-border/80 dark:border-white/10 dark:bg-white/[0.04] dark:text-muted-foreground dark:hover:border-white/18",
                              h === 3 && !range && "border-amber-400/25 bg-amber-500/10",
                              h === 2 && !range && "border-amber-300/30 bg-amber-400/12 dark:border-white/12 dark:bg-white/[0.06]"
                            )}
                          >
                            <span>{d}</span>
                            <span
                              className={cn(
                                "mt-0.5 h-1 w-4 rounded-full opacity-80",
                                h === 0 && "bg-muted-foreground/30 dark:bg-white/15",
                                h === 1 && "bg-emerald-400/35",
                                h === 2 && "bg-amber-300/45",
                                h === 3 && "bg-rose-400/45"
                              )}
                            />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {profile ? (
                    <div className="ar-nested-well rounded-2xl px-4 py-4">
                      <BookingAttendeePicker profile={profile} value={attendees} onChange={setAttendees} />
                      <p className="mt-3 text-center text-[12px] text-muted-foreground">
                        {guests} guest{guests === 1 ? "" : "s"}
                        {attendees.petIds.length > 0
                          ? ` · ${attendees.petIds.length} pet${attendees.petIds.length === 1 ? "" : "s"}`
                          : ""}
                      </p>
                    </div>
                  ) : (
                    <div className="ar-nested-well flex min-h-12 flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="size-4 text-primary" aria-hidden />
                        Guests
                      </div>
                      <div className="flex items-center justify-end gap-2 sm:justify-start">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-9 rounded-xl"
                          onClick={() => setGuests((g) => Math.max(1, g - 1))}
                          aria-label="Fewer guests"
                        >
                          <Minus className="size-4" />
                        </Button>
                        <span className="min-w-[2ch] text-center text-lg font-semibold tabular-nums">{guests}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-9 rounded-xl"
                          onClick={() => setGuests((g) => Math.min(16, g + 1))}
                          aria-label="More guests"
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Rooms & spaces</p>
                    <div className="mt-2 space-y-2">
                      {ROOM_OPTIONS.map((r) => {
                        const active = roomId === r.id;
                        const disabled = !r.available;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => setRoomId(r.id)}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                              active && "border border-primary/35 bg-primary/10",
                              !active && !disabled && "ar-nested-well hover:border-border/70 dark:hover:border-white/16",
                              disabled && "cursor-not-allowed opacity-45"
                            )}
                          >
                            <Home className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                            <div>
                              <p className="text-sm font-medium text-foreground">{r.label}</p>
                              <p className="text-[11px] text-muted-foreground">{r.beds}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="rounded-xl border border-primary/20 bg-primary/8 px-3 py-2 text-center text-[12px] text-muted-foreground">
                    {arrivalLabel}
                  </p>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="trip-title">
                      Trip name (optional)
                    </label>
                    <Input
                      id="trip-title"
                      value={tripTitle}
                      onChange={(e) => setTripTitle(e.target.value)}
                      placeholder="e.g. Memorial Day cousins weekend"
                      className="h-11 rounded-2xl border border-border/60 bg-card/75 dark:border-white/10 dark:bg-white/[0.04]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="trip-purpose">
                      Trip purpose
                    </label>
                    <Input
                      id="trip-purpose"
                      value={tripPurpose}
                      onChange={(e) => setTripPurpose(e.target.value)}
                      placeholder="e.g. Cousins weekend, dock work, slow reset"
                      className="h-11 rounded-2xl border border-border/60 bg-card/75 dark:border-white/10 dark:bg-white/[0.04]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="trip-notes">
                      Notes for the thread
                    </label>
                    <Textarea
                      id="trip-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Dietary notes, boat slip needs, early arrival ask…"
                      className="min-h-[100px] rounded-2xl border border-border/60 bg-card/75 dark:border-white/10 dark:bg-white/[0.04]"
                    />
                  </div>

                  {submitError && (
                    <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-100/95">
                      {submitError}
                    </p>
                  )}
                  <Button
                    type="button"
                    className="h-12 w-full rounded-2xl text-[15px] font-medium"
                    disabled={submitting || !user || authLoading || !configured}
                    onClick={() => void handleSubmit()}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                        Saving to calendar…
                      </>
                    ) : (
                      recordType === "event" ? "Submit event" : "Submit booking"
                    )}
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
          <ActionToastBanner toast={toast} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
