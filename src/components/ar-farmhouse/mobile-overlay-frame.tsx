"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { OverlayPortal } from "@/components/ar-farmhouse/overlay-portal";
import {
  AR_BOTTOM_SHEET_HOST,
  AR_CENTERED_MODAL_HOST,
  AR_OVERLAY_SCRIM,
} from "@/lib/mobile-overlay";
import { cn } from "@/lib/utils";

export type MobileOverlayVariant = "bottom-sheet" | "centered";

export type MobileOverlayFrameProps = {
  open: boolean;
  variant?: MobileOverlayVariant;
  zIndexClass?: string;
  onDismiss?: () => void;
  dismissDisabled?: boolean;
  dismissLabel?: string;
  hostClassName?: string;
  children: ReactNode;
};

/**
 * Portaled overlay host with Safari-safe viewport height and bottom inset.
 * Wrap dialog/sheet panels as children; scrim dismiss is optional.
 */
export function MobileOverlayFrame({
  open,
  variant = "bottom-sheet",
  zIndexClass = "z-[70]",
  onDismiss,
  dismissDisabled = false,
  dismissLabel = "Close",
  hostClassName,
  children,
}: MobileOverlayFrameProps) {
  const reduceMotion = useReducedMotion();
  const host =
    variant === "centered" ? AR_CENTERED_MODAL_HOST : AR_BOTTOM_SHEET_HOST;

  return (
    <AnimatePresence>
      {open ? (
        <OverlayPortal>
          <motion.div
            className={cn(host, zIndexClass, hostClassName)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
            role="presentation"
          >
            {onDismiss ? (
              <button
                type="button"
                className={AR_OVERLAY_SCRIM}
                aria-label={dismissLabel}
                onClick={onDismiss}
                disabled={dismissDisabled}
              />
            ) : null}
            {children}
          </motion.div>
        </OverlayPortal>
      ) : null}
    </AnimatePresence>
  );
}
