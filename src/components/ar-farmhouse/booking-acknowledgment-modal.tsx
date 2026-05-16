"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  BOOKING_FIREARMS_ACKNOWLEDGMENT_TEXT,
  BOOKING_GENERAL_ACKNOWLEDGMENT_TEXT,
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

type AcknowledgmentRowProps = {
  checked: boolean;
  disabled: boolean;
  label: string;
  onToggle: () => void;
  reduceMotion: boolean | null;
  delay: number;
};

function AcknowledgmentRow({
  checked,
  disabled,
  label,
  onToggle,
  reduceMotion,
  delay,
}: AcknowledgmentRowProps) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduceMotion ? 0 : delay, duration: 0.24 }}
    >
      <label
        className={cn(
          "flex cursor-pointer gap-4 rounded-[1.25rem] border px-4 py-4 transition-[border-color,background-color,box-shadow] duration-200 touch-manipulation",
          checked
            ? "border-primary/35 bg-primary/[0.08] shadow-[0_0_0_1px_oklch(from_var(--primary)_l_c_h_/_0.1)]"
            : "border-border/50 bg-muted/30 hover:border-border/75 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/16"
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
        />
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border-2 transition-[border-color,background-color,transform] duration-200",
            checked
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/70 bg-background/90 dark:border-white/22 dark:bg-white/[0.04]"
          )}
        >
          <Check
            className={cn(
              "size-4 transition-[opacity,transform] duration-200",
              checked ? "scale-100 opacity-100" : "scale-75 opacity-0"
            )}
          />
        </span>
        <span className="text-[15px] leading-[1.55] text-foreground/95">{label}</span>
      </label>
    </motion.div>
  );
}

export function BookingAcknowledgmentModal({
  open,
  submitting = false,
  onClose,
  onConfirm,
}: BookingAcknowledgmentModalProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const sectionId = useId();
  const [generalChecked, setGeneralChecked] = useState(false);
  const [firearmsChecked, setFirearmsChecked] = useState(false);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    setGeneralChecked(false);
    setFirearmsChecked(false);
  }, [open]);

  const allAcknowledged = generalChecked && firearmsChecked;

  const handleConfirm = useCallback(() => {
    if (!allAcknowledged || submitting) return;
    onConfirm(createBookingPolicyAcknowledgment());
  }, [allAcknowledged, onConfirm, submitting]);

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
            aria-label="Close confirmation"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={sectionId}
            initial={reduceMotion ? false : { y: 36, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { y: 28, opacity: 0, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className={cn(
              "ar-modal-shell relative z-10 flex w-full max-w-lg min-h-0 flex-col overflow-hidden",
              "max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))]",
              "rounded-t-[1.75rem] sm:max-h-[min(88dvh,760px)] sm:rounded-[1.75rem]"
            )}
          >
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.05, duration: 0.2 }}
              className="shrink-0 px-5 pb-3 pt-3 sm:pt-4"
            >
              <motion.div
                aria-hidden
                className="mx-auto mb-4 h-1 w-10 rounded-full bg-border/70 dark:bg-white/18"
                initial={reduceMotion ? false : { scaleX: 0.6, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.08, duration: 0.2 }}
              />
              <h2
                id={titleId}
                className="text-center font-heading text-[1.35rem] font-semibold tracking-tight text-foreground"
              >
                Confirmation
              </h2>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.08, duration: 0.22 }}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2"
            >
              <div id={sectionId} className="space-y-4">
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.1, duration: 0.2 }}
                >
                  <p className="font-heading text-[17px] font-semibold text-foreground">
                    Acknowledgments
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
                    Please review and acknowledge the following policies:
                  </p>
                </motion.div>

                <motion.div
                  className="space-y-3"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reduceMotion ? 0 : 0.12, duration: 0.22 }}
                >
                  <AcknowledgmentRow
                    checked={generalChecked}
                    disabled={submitting}
                    label={BOOKING_GENERAL_ACKNOWLEDGMENT_TEXT}
                    onToggle={() => !submitting && setGeneralChecked((v) => !v)}
                    reduceMotion={reduceMotion}
                    delay={0.14}
                  />
                  <AcknowledgmentRow
                    checked={firearmsChecked}
                    disabled={submitting}
                    label={BOOKING_FIREARMS_ACKNOWLEDGMENT_TEXT}
                    onToggle={() => !submitting && setFirearmsChecked((v) => !v)}
                    reduceMotion={reduceMotion}
                    delay={0.18}
                  />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.14, duration: 0.22 }}
              className="shrink-0 border-t border-border/45 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-4 dark:border-white/10"
            >
              <motion.div layout={!reduceMotion} className="flex gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 min-h-12 flex-1 rounded-2xl border-border/60 text-[15px] font-medium dark:border-white/12"
                  disabled={submitting}
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className={cn(
                    "h-12 min-h-12 flex-1 rounded-2xl text-[15px] font-semibold transition-opacity duration-200",
                    !allAcknowledged && "pointer-events-none opacity-40"
                  )}
                  disabled={!allAcknowledged || submitting}
                  onClick={handleConfirm}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Submitting…
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
