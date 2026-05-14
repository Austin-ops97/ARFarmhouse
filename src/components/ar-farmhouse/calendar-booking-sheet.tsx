"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarRange, Home, Minus, Plus, Sparkles, Users, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  demoBookingTripTypes,
  demoOccupancyByDay,
  demoPropertyRooms,
} from "@/lib/calendar-demo";
import { demoCalendarMonth } from "@/lib/social-demo";
import { cn } from "@/lib/utils";

type CalendarBookingSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CalendarBookingSheet({ open, onOpenChange }: CalendarBookingSheetProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const [tripId, setTripId] = useState<string>("family");
  const [guests, setGuests] = useState(6);
  const [roomId, setRoomId] = useState<string>("main");
  const [startDay, setStartDay] = useState(23);
  const [endDay, setEndDay] = useState(26);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const close = useCallback(() => {
    setSubmitted(false);
    onOpenChange(false);
  }, [onOpenChange]);

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
    for (let i = 0; i < demoCalendarMonth.leadingBlanks; i++) out.push({ type: "blank" });
    for (let d = 1; d <= demoCalendarMonth.daysInMonth; d++) out.push({ type: "day", day: d });
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

  const heat = (d: number) => demoOccupancyByDay[d] ?? 0;

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
          <button type="button" className="ar-scrim absolute inset-0" aria-label="Close" onClick={close} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { y: 22, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={cn(
              "ar-modal-shell relative z-10 flex max-h-[min(92dvh,100dvh)] w-full max-w-[100vw] flex-col overflow-hidden rounded-t-[1.75rem] touch-manipulation",
              "sm:max-h-[min(94dvh,920px)] sm:max-w-lg md:max-w-xl md:rounded-[1.75rem]"
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/45 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pb-4 dark:border-white/10">
              <div>
                <p id={titleId} className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  Book a stay
                </p>
                <p className="text-xs text-muted-foreground">Demo flow · nothing is saved</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-5 sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {submitted ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 py-10 text-center"
                >
                  <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary">
                    <Sparkles className="size-7" aria-hidden />
                  </span>
                  <p className="font-heading text-xl font-semibold text-foreground">Request placed</p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    In a live build this would notify the house thread and hold dates while someone confirms.
                  </p>
                  <Button type="button" className="rounded-xl" onClick={close}>
                    Done
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Trip type</p>
                    <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                      {demoBookingTripTypes.map((t) => {
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
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <CalendarRange className="size-3.5" aria-hidden />
                      Dates · May 2026
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Tap start, then end. Shading shows occupancy (lighter is calmer).
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
                              h === 2 &&
                                !range &&
                                "border-amber-300/30 bg-amber-400/12 dark:border-white/12 dark:bg-white/[0.06]"
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

                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Rooms & spaces</p>
                    <div className="mt-2 space-y-2">
                      {demoPropertyRooms.map((r) => {
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
                              {disabled && <p className="mt-1 text-[10px] text-amber-200/80">Held for Memorial week</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="trip-purpose">
                      Trip purpose
                    </label>
                    <Input
                      id="trip-purpose"
                      placeholder="e.g. Cousins weekend, dock stain party, slow reset"
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

                  <Button
                    type="button"
                    className="h-12 w-full rounded-2xl text-[15px] font-medium"
                    onClick={() => setSubmitted(true)}
                  >
                    Send booking request
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
