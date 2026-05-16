"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type BookingModerationVariant = "deny" | "delete";

const COPY: Record<
  BookingModerationVariant,
  { title: string; confirm: string; placeholder: string; destructive?: boolean }
> = {
  deny: {
    title: "Deny booking?",
    confirm: "Confirm deny",
    placeholder: "Reason for denial (optional)",
  },
  delete: {
    title: "Delete this booking?",
    confirm: "Delete booking",
    placeholder: "Reason for deletion (optional)",
    destructive: true,
  },
};

type BookingModerationDialogProps = {
  open: boolean;
  variant: BookingModerationVariant;
  bookingTitle: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function BookingModerationDialog({
  open,
  variant,
  bookingTitle,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
  busy = false,
}: BookingModerationDialogProps) {
  const reduceMotion = useReducedMotion();
  const copy = COPY[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="ar-scrim absolute inset-0"
            aria-label="Close"
            onClick={() => !busy && onClose()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={reduceMotion ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { y: 16, opacity: 0 }}
            className="ar-modal-shell relative z-10 w-full max-w-md rounded-t-[1.75rem] p-5 sm:rounded-[1.75rem]"
          >
            <p className="font-heading text-lg font-semibold text-foreground">{copy.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{bookingTitle}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {variant === "deny"
                ? "The requester will be notified. Dates will be freed on the calendar immediately."
                : "This removes the booking from the calendar. The member will be notified."}
            </p>
            <Textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder={copy.placeholder}
              className="mt-4 min-h-[88px] rounded-2xl"
              disabled={busy}
            />
            <motion.div layout={!reduceMotion} className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 flex-1 rounded-xl"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className={cn(
                  "min-h-11 flex-1 rounded-xl",
                  copy.destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                )}
                disabled={busy}
                onClick={onConfirm}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : copy.confirm}
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
