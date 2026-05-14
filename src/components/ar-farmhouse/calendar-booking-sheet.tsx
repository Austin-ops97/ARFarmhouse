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
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.22 }}
        >
          <button type="button" className="absolute inset-0 bg-background/75 backdrop-blur-xl" aria-label="Close" onClick={close} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { y: 28, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { y: 22, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={cn(
              "relative z-10 flex max-h-[min(94dvh,920px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-white/12",
              "bg-background/92 shadow-[0_40px_120px_-48px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:max-w-xl sm:rounded-[1.75rem]"
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
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

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
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
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {demoBookingTripTypes.map((t) => {
                        const active = tripId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTripId(t.id)}
                            className={cn(
                              "rounded-2xl border px-3 py-3 text-left transition-colors",
                              active
                                ? "border-primary/35 bg-primary/12 text-foreground"
                                : "border-white/10 bg-white/[0.03] hover:border-white/16"
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
                    <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
                      {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
                        <span key={`${w}-${i}`}>{w}</span>
                      ))}
                    </div>
                    <div className="mt-1 grid grid-cols-7 gap-1">
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
                              "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-[11px] font-medium transition-colors",
                              range
                                ? "border-primary/40 bg-primary/20 text-foreground"
                                : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/18",
                              h === 3 && !range && "border-amber-400/25 bg-amber-500/10",
                              h === 2 && !range && "border-white/12 bg-white/[0.06]"
                            )}
                          >
                            <span>{d}</span>
                            <span
                              className={cn(
                                "mt-0.5 h-1 w-4 rounded-full opacity-80",
                                h === 0 && "bg-white/15",
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

                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="size-4 text-primary" aria-hidden />
                      Guests
                    </div>
                    <div className="flex items-center gap-2">
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
                              "flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
                              active && "border-primary/35 bg-primary/10",
                              !active && !disabled && "border-white/10 bg-white/[0.03] hover:border-white/16",
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
                      className="h-11 rounded-2xl border-white/10 bg-white/[0.04]"
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
                      className="min-h-[100px] rounded-2xl border-white/10 bg-white/[0.04]"
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
