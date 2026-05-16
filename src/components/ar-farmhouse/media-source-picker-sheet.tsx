"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Camera, ImageIcon, X } from "lucide-react";
import { useEffect, useId } from "react";

import { MobileOverlayFrame } from "@/components/ar-farmhouse/mobile-overlay-frame";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { AR_ACTION_SHEET } from "@/lib/mobile-overlay";
import { cn } from "@/lib/utils";

export type MediaSourcePickerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTakePhoto: () => void;
  onUploadFromLibrary: () => void;
  title?: string;
  subtitle?: string;
  takePhotoLabel?: string;
  uploadLabel?: string;
  disabled?: boolean;
};

export function MediaSourcePickerSheet({
  open,
  onOpenChange,
  onTakePhoto,
  onUploadFromLibrary,
  title = "Add photo",
  subtitle = "Choose how you want to add an image",
  takePhotoLabel = "Take Photo",
  uploadLabel = "Upload From Library",
  disabled = false,
}: MediaSourcePickerSheetProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !disabled) onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, onOpenChange, open]);

  const dismiss = () => {
    if (disabled) return;
    onOpenChange(false);
  };

  return (
    <MobileOverlayFrame
      open={open}
      variant="bottom-sheet"
      zIndexClass="z-[80]"
      onDismiss={dismiss}
      dismissDisabled={disabled}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={reduceMotion ? false : { y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduceMotion ? undefined : { y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className={cn(
          AR_ACTION_SHEET,
          "border border-white/12 bg-background/95 shadow-[0_40px_120px_-48px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          aria-hidden
          className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border/70 dark:bg-white/18 sm:hidden"
          initial={reduceMotion ? false : { scaleX: 0.6, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.06, duration: 0.2 }}
        />
        <motion.div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 pb-4 pt-3">
          <div>
            <p id={titleId} className="font-heading text-lg font-semibold tracking-tight text-foreground">
              {title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <button
            type="button"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-foreground transition hover:bg-white/[0.08]"
            onClick={dismiss}
            disabled={disabled}
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </motion.div>

        <motion.div
          className="grid gap-3 px-5 py-5"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduceMotion ? 0 : 0.04 }}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={onTakePhoto}
            className={cn(
              "flex min-h-[4.25rem] items-center gap-4 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-left transition",
              "hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-primary/15 text-primary">
              <Camera className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{takePhotoLabel}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Opens your camera · rear lens preferred on phones
              </span>
            </span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={onUploadFromLibrary}
            className={cn(
              "flex min-h-[4.25rem] items-center gap-4 rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-3.5 text-left transition",
              "hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-foreground">
              <ImageIcon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{uploadLabel}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Choose from photos, files, or cloud albums
              </span>
            </span>
          </button>
        </motion.div>
      </motion.div>
    </MobileOverlayFrame>
  );
}
