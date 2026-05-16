"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ExternalLink, Phone, X } from "lucide-react";
import { useCallback, useEffect, useId } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { LocalGuideMapPreview } from "@/components/ar-farmhouse/local-guide-map-preview";
import type { LocalGuideRow } from "@/lib/local-guide-types";
import { familyRecommendations, isVerifiedRow } from "@/lib/local-guide";
import { OverlayPortal } from "@/components/ar-farmhouse/overlay-portal";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { AR_BOTTOM_SHEET_HOST, AR_MOBILE_SHEET, AR_OVERLAY_SCRIM } from "@/lib/mobile-overlay";
import { cn } from "@/lib/utils";

type LocalGuideDetailSheetProps = {
  place: LocalGuideRow | null;
  onClose: () => void;
};

export function LocalGuideDetailSheet({ place, onClose }: LocalGuideDetailSheetProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  useBodyScrollLock(Boolean(place));

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!place) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [place, close]);

  const mapsUrl = place
    ? `https://maps.apple.com/?q=${encodeURIComponent(place.address || place.business)}`
    : "#";

  const telHref = place?.phone ? `tel:${place.phone.replace(/[^\d+]/g, "")}` : undefined;

  return (
    <AnimatePresence>
      {place && (
        <OverlayPortal>
        <motion.div
          className={cn(AR_BOTTOM_SHEET_HOST, "z-[75]")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.16 }}
        >
          <button type="button" className={AR_OVERLAY_SCRIM} aria-label="Close" onClick={close} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { y: 28, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className={cn(AR_MOBILE_SHEET, "sm:max-h-[min(92dvh,880px)]")}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/45 px-5 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-white/10">
              <div className="min-w-0">
                <p id={titleId} className="truncate font-heading text-lg font-semibold tracking-tight text-foreground">
                  {place.business}
                </p>
                <p className="truncate text-xs text-muted-foreground">{place.category}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <LocalGuideMapPreview
                className={place.section === "stores" ? "h-32 w-full sm:h-36" : "h-36 w-full sm:h-40"}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {isVerifiedRow(place) ? (
                  <span className="rounded-full border border-emerald-400/28 bg-emerald-500/12 px-2.5 py-1 text-[10px] font-medium text-emerald-100/95">
                    Verified listing
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-50/95">
                    Confirm hours before visiting
                  </span>
                )}
                <span className="rounded-full border border-border/50 bg-muted/50 px-2.5 py-1 text-[10px] text-muted-foreground dark:border-white/10 dark:bg-white/[0.05]">
                  {place.distanceMi} mi from farmhouse
                </span>
              </div>

              {place.section === "restaurants" && familyRecommendations[place.key] ? (
                <div className="mt-4 rounded-2xl border border-primary/18 bg-primary/[0.06] px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-primary/80">Family note</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
                    {familyRecommendations[place.key]}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 space-y-2 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Address</span>
                  <br />
                  {place.address || "Not verified in dataset — ask in the house thread."}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Phone</span>
                  <br />
                  {place.phone || "Not on file"}
                </p>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Source notes</span>
                  <br />
                  {place.notes}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border/45 px-5 py-4 dark:border-white/10">
              {telHref ? (
                <a
                  href={telHref}
                  className={cn(
                    buttonVariants({ variant: "default", size: "sm" }),
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl sm:flex-none"
                  )}
                >
                  <Phone className="size-4" aria-hidden />
                  Call
                </a>
              ) : (
                <Button type="button" size="sm" className="flex-1 rounded-xl sm:flex-none" disabled>
                  <Phone className="size-4" data-icon="inline-start" />
                  Call
                </Button>
              )}
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl sm:flex-none"
                )}
                onClick={() => {
                  window.location.assign(mapsUrl);
                }}
              >
                <ExternalLink className="size-4" aria-hidden />
                Open in Maps
              </button>
            </div>
          </motion.div>
        </motion.div>
        </OverlayPortal>
      )}
    </AnimatePresence>
  );
}
