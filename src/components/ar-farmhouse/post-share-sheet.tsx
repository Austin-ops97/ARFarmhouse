"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Copy, Link2, Share2, X } from "lucide-react";
import { startTransition, useCallback, useEffect, useState } from "react";
import { OverlayPortal } from "@/components/ar-farmhouse/overlay-portal";
import { Button } from "@/components/ui/button";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { AR_ACTION_SHEET, AR_BOTTOM_SHEET_HOST, AR_OVERLAY_SCRIM } from "@/lib/mobile-overlay";
import { buildPostDeepLink } from "@/lib/app-url";
import { cn } from "@/lib/utils";

type PostShareSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  title?: string;
  summary: string;
};

export function PostShareSheet({ open, onOpenChange, postId, title, summary }: PostShareSheetProps) {
  const reduceMotion = useReducedMotion();
  useBodyScrollLock(open);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const url = buildPostDeepLink(postId);

  useEffect(() => {
    if (!open) return;
    startTransition(() => setCopied(false));
  }, [open]);

  const copyLink = useCallback(async () => {
    if (!url) {
      setCopyError("Set NEXT_PUBLIC_SITE_URL for share links.");
      return;
    }
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Could not copy link — try selecting it manually.");
    }
  }, [url]);

  const nativeShare = useCallback(async () => {
    const shareData: ShareData = {
      title: title?.trim() || "Family update",
      text: summary.slice(0, 280),
      url: url || undefined,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        onOpenChange(false);
      } catch {
        /* user cancelled or share failed */
      }
    } else {
      await copyLink();
    }
  }, [copyLink, onOpenChange, summary, title, url]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <OverlayPortal>
        <motion.div
          role="presentation"
          className={cn(AR_BOTTOM_SHEET_HOST, "z-[110]")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
        >
          <button
            type="button"
            className={AR_OVERLAY_SCRIM}
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Share post"
            initial={reduceMotion ? false : { y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              AR_ACTION_SHEET,
              "border border-border/60 bg-card/95 shadow-[var(--ar-modal-elevate)] dark:border-white/12 dark:bg-zinc-950/95 sm:rounded-[1.35rem]"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 dark:border-white/10">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Share2 className="size-4 text-primary" aria-hidden />
                Share
              </div>
              <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => onOpenChange(false)}>
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            <div className="space-y-2 px-4 py-4">
              <p className="text-xs text-muted-foreground">Anyone with the link can open this app and jump to the feed.</p>
              {url ? (
                <div className="flex items-center gap-2 rounded-xl border border-border/55 bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]">
                  <Link2 className="size-3.5 shrink-0 opacity-70" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/85">{url}</span>
                </div>
              ) : (
                <p className="text-xs text-amber-600/90 dark:text-amber-400/90">Set NEXT_PUBLIC_SITE_URL for reliable share links in all environments.</p>
              )}
            </div>
            {copyError ? <p className="px-4 text-xs text-red-400/95">{copyError}</p> : null}
            <div className="flex flex-col gap-2 border-t border-border/50 px-4 py-4 dark:border-white/10">
              {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
                <Button type="button" className="h-11 w-full rounded-xl" onClick={() => void nativeShare()}>
                  <Share2 className="mr-2 size-4" aria-hidden />
                  Share via…
                </Button>
              ) : null}
              <Button type="button" variant="secondary" className="h-11 w-full rounded-xl" onClick={() => void copyLink()}>
                {copied ? (
                  <>
                    <Check className="mr-2 size-4 text-emerald-500" aria-hidden />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 size-4" aria-hidden />
                    Copy link
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
        </OverlayPortal>
      )}
    </AnimatePresence>
  );
}
