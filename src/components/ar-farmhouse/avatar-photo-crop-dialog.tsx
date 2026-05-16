"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AVATAR_OUTPUT_SIZE,
  processAvatarFromCrop,
  type AvatarCropPixels,
} from "@/lib/image-avatar-process";
import { OverlayPortal } from "@/components/ar-farmhouse/overlay-portal";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { AR_CENTERED_MODAL_HOST, AR_MOBILE_SHEET, AR_OVERLAY_SCRIM } from "@/lib/mobile-overlay";
import { cn } from "@/lib/utils";

export type AvatarPhotoCropDialogProps = {
  open: boolean;
  imageSrc: string | null;
  fileName?: string;
  displayName?: string;
  onOpenChange: (open: boolean) => void;
  onComplete: (file: File, previewUrl: string) => void | Promise<void>;
};

type Phase = "idle" | "processing";

export function AvatarPhotoCropDialog({
  open,
  imageSrc,
  fileName,
  displayName,
  onOpenChange,
  onComplete,
}: AvatarPhotoCropDialogProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<AvatarCropPixels | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  useBodyScrollLock(open && Boolean(imageSrc));

  const busy = phase !== "idle";

  const resetEditor = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setError(null);
    setPhase("idle");
  }, []);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => resetEditor());
    }
  }, [open, resetEditor]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onOpenChange, open]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels({
      x: Math.round(pixels.x),
      y: Math.round(pixels.y),
      width: Math.round(pixels.width),
      height: Math.round(pixels.height),
    });
  }, []);

  const dismiss = useCallback(() => {
    if (busy) return;
    onOpenChange(false);
  }, [busy, onOpenChange]);

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels || busy) return;
    setError(null);
    setPhase("processing");
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const { file, blob } = await processAvatarFromCrop(imageSrc, croppedAreaPixels, rotation);
      const localPreview = URL.createObjectURL(blob);
      void onComplete(file, localPreview);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare that photo.");
      setPhase("idle");
    }
  };

  const rotateBy = (delta: number) => setRotation((r) => r + delta);

  return (
    <AnimatePresence>
      {open && imageSrc ? (
        <OverlayPortal>
        <motion.div
          className={cn(AR_CENTERED_MODAL_HOST, "z-[70] overscroll-contain")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.22 }}
        >
          <button
            type="button"
            className={AR_OVERLAY_SCRIM}
            aria-label="Close"
            onClick={dismiss}
            disabled={busy}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { y: 16, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className={cn(
              AR_MOBILE_SHEET,
              "max-w-lg rounded-t-[1.5rem] border border-border/60 bg-card/95 shadow-[var(--ar-modal-elevate)] backdrop-blur-2xl sm:max-h-[min(94dvh,720px)] sm:rounded-[1.5rem] dark:border-white/10"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-border/50 px-4 py-3.5 dark:border-white/[0.06]">
              <motion.div>
                <p id={titleId} className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  Crop profile photo
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fileName ? `${fileName} · ` : ""}
                  Saved as {AVATAR_OUTPUT_SIZE}×{AVATAR_OUTPUT_SIZE} optimized for the app
                </p>
              </motion.div>
              <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-xl" onClick={dismiss} disabled={busy} aria-label="Close">
                <X className="size-4" />
              </Button>
            </header>

            <div className="relative aspect-square w-full bg-muted/30">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                objectFit="contain"
                classes={{
                  containerClassName: "rounded-none",
                  cropAreaClassName: "!border-2 !border-white/90 !shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]",
                }}
              />
              {busy ? (
                <motion.div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/55 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
                  <p className="text-sm font-medium text-foreground">Preparing photo…</p>
                </motion.div>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-border/50 px-4 py-3 dark:border-white/[0.06]">
              <motion.div className="flex items-center gap-3">
                <p className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
                <Avatar className="size-14 ring-2 ring-background">
                  <AvatarImage src={imageSrc} alt="" className="object-cover" />
                  <AvatarFallback>{displayName?.slice(0, 1) ?? "?"}</AvatarFallback>
                </Avatar>
                <p className="text-xs text-muted-foreground">Drag to reposition · pinch or slider to zoom</p>
              </motion.div>

              <div className="flex items-center gap-2">
                <ZoomOut className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.02}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  disabled={busy}
                  className="h-2 flex-1 accent-primary"
                  aria-label="Zoom"
                />
                <ZoomIn className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={busy}
                  onClick={() => rotateBy(-90)}
                >
                  <RotateCcw className="mr-1.5 size-3.5" aria-hidden />
                  Rotate left
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={busy}
                  onClick={() => rotateBy(90)}
                >
                  <RotateCw className="mr-1.5 size-3.5" aria-hidden />
                  Rotate right
                </Button>
              </div>

              {error ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200/95" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={dismiss} disabled={busy}>
                  Cancel
                </Button>
                <Button type="button" className="flex-1 rounded-xl" onClick={() => void handleApply()} disabled={busy || !croppedAreaPixels}>
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Processing…
                    </>
                  ) : (
                    "Save photo"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
        </OverlayPortal>
      ) : null}
    </AnimatePresence>
  );
}
