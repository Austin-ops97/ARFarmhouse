"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  BOOKING_ACKNOWLEDGMENTS,
  createBookingPolicyAcknowledgment,
  type BookingPolicyAcknowledgment,
} from "@/lib/booking-acknowledgments";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { cn } from "@/lib/utils";

type BookingAcknowledgmentModalProps = {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (acknowledgment: BookingPolicyAcknowledgment) => void;
};

export function BookingAcknowledgmentModal({
  open,
  submitting = false,
  onClose,
  onConfirm,
}: BookingAcknowledgmentModalProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setChecked({});
  }, [open]);

  const acknowledgedCount = useMemo(
    () => BOOKING_ACKNOWLEDGMENTS.filter((item) => checked[item.id]).length,
    [checked]
  );

  const allAcknowledged = acknowledgedCount === BOOKING_ACKNOWLEDGMENTS.length;

  const toggle = useCallback((id: string) => {
    if (submitting) return;
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, [submitting]);

  const handleConfirm = useCallback(() => {
    if (!allAcknowledged || submitting) return;
    const acknowledgedIds = BOOKING_ACKNOWLEDGMENTS.filter((item) => checked[item.id]).map(
      (item) => item.id
    );
    onConfirm(createBookingPolicyAcknowledgment(acknowledgedIds));
  }, [allAcknowledged, checked, onConfirm, submitting]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-end justify-center p-0 sm:items-center sm:p-4 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.22 }}
        >
          <button
            type="button"
            className="ar-scrim absolute inset-0"
            aria-label="Close acknowledgments"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { y: 32, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className={cn(
              "ar-modal-shell relative z-10 flex w-full max-w-lg min-h-0 flex-col overflow-hidden",
              "max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))]",
              "rounded-t-[1.75rem] sm:max-h-[min(88dvh,760px)] sm:rounded-[1.75rem]"
            )}
          >
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.05, duration: 0.2 }}
              className="flex shrink-0 items-start justify-between gap-3 border-b border-border/45 px-5 pb-4 pt-5 dark:border-white/10"
            >
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.08, type: "spring", stiffness: 400, damping: 28 }}
                className="flex items-start gap-3"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/12 text-primary">
                  <ShieldCheck className="size-5" aria-hidden />
                </span>
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.1, duration: 0.2 }}
                >
                  <p id={titleId} className="font-heading text-lg font-semibold tracking-tight text-foreground">
                    Booking acknowledgments
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    Review and accept each item before your request is sent.
                  </p>
                </motion.div>
              </motion.div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-xl"
                onClick={onClose}
                disabled={submitting}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
            </motion.div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {acknowledgedCount} of {BOOKING_ACKNOWLEDGMENTS.length} accepted
              </p>
              <ul className="space-y-2.5">
                {BOOKING_ACKNOWLEDGMENTS.map((item, index) => {
                  const isChecked = Boolean(checked[item.id]);
                  return (
                    <motion.li
                      key={item.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: reduceMotion ? 0 : 0.04 + index * 0.025,
                        duration: 0.22,
                      }}
                    >
                      <label
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-2xl border px-3.5 py-3.5 transition-[border-color,background-color,box-shadow] duration-200 touch-manipulation",
                          isChecked
                            ? "border-primary/35 bg-primary/10 shadow-[0_0_0_1px_oklch(from_var(--primary)_l_c_h_/_0.12)]"
                            : "border-border/55 bg-muted/35 hover:border-border/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/16"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isChecked}
                          disabled={submitting}
                          onChange={() => toggle(item.id)}
                        />
                        <span
                          aria-hidden
                          className={cn(
                            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border-2 transition-[border-color,background-color,transform] duration-200",
                            isChecked
                              ? "scale-100 border-primary bg-primary text-primary-foreground"
                              : "scale-100 border-border/70 bg-background/80 dark:border-white/22 dark:bg-white/[0.04]"
                          )}
                        >
                          <Check
                            className={cn(
                              "size-3.5 transition-[opacity,transform] duration-200",
                              isChecked ? "scale-100 opacity-100" : "scale-75 opacity-0"
                            )}
                          />
                        </span>
                        <span className="text-[13px] leading-relaxed text-foreground/95">{item.text}</span>
                      </label>
                    </motion.li>
                  );
                })}
              </ul>
            </div>

            <div className="shrink-0 space-y-2.5 border-t border-border/45 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-4 dark:border-white/10">
              <Button
                type="button"
                className={cn(
                  "h-12 w-full rounded-2xl text-[15px] font-semibold transition-opacity duration-200",
                  !allAcknowledged && "pointer-events-none opacity-40"
                )}
                disabled={!allAcknowledged || submitting}
                onClick={handleConfirm}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Submitting request…
                  </>
                ) : (
                  "Submit booking request"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-2xl border-border/60 text-[14px] dark:border-white/12"
                disabled={submitting}
                onClick={onClose}
              >
                Go back
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
