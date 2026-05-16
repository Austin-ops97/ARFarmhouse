"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

import { MobileOverlayFrame } from "@/components/ar-farmhouse/mobile-overlay-frame";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { AR_MOBILE_SHEET } from "@/lib/mobile-overlay";
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

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose, open]);

  return (
    <MobileOverlayFrame
      open={open}
      variant="centered"
      zIndexClass="z-[80]"
      onDismiss={onClose}
      dismissDisabled={busy}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={reduceMotion ? false : { y: 16, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={reduceMotion ? undefined : { y: 12, opacity: 0, scale: 0.99 }}
        transition={{ type: "spring", stiffness: 360, damping: 32 }}
        className={cn(AR_MOBILE_SHEET, "max-w-md overflow-y-auto overscroll-contain p-5 sm:rounded-[1.75rem]")}
        onClick={(e) => e.stopPropagation()}
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
    </MobileOverlayFrame>
  );
}
