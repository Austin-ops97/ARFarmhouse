"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Upload, X } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { MediaAttachZone } from "@/components/ar-farmhouse/media-attach-zone";
import { useImageAttachments } from "@/hooks/use-image-attachments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { isLargeRawImage, validateRawImageFile } from "@/lib/image-input";
import { ALBUM_UPLOAD_BUCKETS } from "@/lib/photo-album-media";
import { createAlbumMediaItems } from "@/services/album-media";
import { cn } from "@/lib/utils";

type PhotoAlbumUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: () => void;
};

export function PhotoAlbumUploadDialog({ open, onOpenChange, onUploaded }: PhotoAlbumUploadDialogProps) {
  const reduceMotion = useReducedMotion();
  const inputId = useId();
  const { user, displayName, avatarUrl } = useAuth();
  const { attachments, files, addFiles, removeAt, clear: clearAttachments } = useImageAttachments({
    maxCount: 12,
  });
  const [albumKey, setAlbumKey] = useState<string>(ALBUM_UPLOAD_BUCKETS[0].key);
  const [caption, setCaption] = useState("");
  const [eventLink, setEventLink] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{
    phase: "optimizing" | "uploading";
    done: number;
    total: number;
    percent?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    clearAttachments();
    setCaption("");
    setEventLink("");
    setAlbumKey(ALBUM_UPLOAD_BUCKETS[0].key);
    setProgress(null);
    setError(null);
  }, [clearAttachments]);

  const onDropFiles = useCallback(
    (list: FileList) => {
      addFiles(list);
      setError(null);
    },
    [addFiles]
  );

  const dismiss = useCallback(() => {
    clearAttachments();
    reset();
    onOpenChange(false);
  }, [clearAttachments, onOpenChange, reset]);

  const handleSubmit = async () => {
    if (files.length === 0 || !user) return;
    setBusy(true);
    setError(null);
    setProgress({ phase: "optimizing", done: 0, total: files.length });
    try {
      for (const file of files) validateRawImageFile(file);
      await createAlbumMediaItems(
        {
          authorId: user.uid,
          authorDisplayName: displayName || user.displayName || "Family member",
          authorPhotoUrl: avatarUrl ?? user.photoURL ?? null,
          caption,
          albumKey,
          linkedEvent: eventLink.trim() || null,
          files,
        },
        (p) =>
          setProgress({
            phase: p.phase,
            done: p.done,
            total: p.total,
            percent: p.phase === "uploading" ? p.percent : undefined,
          })
      );
      clearAttachments();
      reset();
      onOpenChange(false);
      onUploaded?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" className="ar-scrim absolute inset-0" aria-label="Dismiss" onClick={dismiss} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${inputId}-title`}
            initial={reduceMotion ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={cn(
              "ar-modal-shell relative z-10 flex max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-bottom,0px)))] w-full max-w-lg min-h-0 flex-col overflow-hidden rounded-t-[1.75rem] sm:max-h-[min(92dvh,880px)]",
              "sm:rounded-[1.75rem]"
            )}
          >
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div>
                <p id={`${inputId}-title`} className="font-heading text-base font-semibold tracking-tight text-foreground">
                  Add to family archive
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Saved for everyone signed in · optimized for mobile
                </p>
              </div>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/50 transition hover:bg-muted/60"
                onClick={dismiss}
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <MediaAttachZone
                disabled={busy}
                multiple
                showDesktopDropHint
                className="border-border/80 bg-muted/25 hover:border-primary/35 hover:bg-muted/40"
                title="Add to family archive"
                hint="Take a memory on the spot or upload from your library — high quality preserved"
                onFiles={(list) => {
                  addFiles(list);
                  setError(null);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.length) onDropFiles(e.dataTransfer.files);
                }}
              />

              {attachments.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {attachments.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      className="group relative aspect-square overflow-hidden rounded-xl bg-muted/30 ring-1 ring-border/50"
                    >
                      {item.preview ? (
                        <Image src={item.preview} alt="" fill className="object-cover" sizes="120px" unoptimized />
                      ) : (
                        <div className="absolute inset-0 animate-pulse bg-muted/50" aria-hidden />
                      )}
                      <button
                        type="button"
                        onClick={() => removeAt(idx)}
                        className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm"
                        aria-label="Remove"
                      >
                        <X className="size-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {progress && busy && (
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${
                          progress.phase === "uploading" && progress.percent != null
                            ? Math.round(
                                ((progress.done + progress.percent / 100) / progress.total) * 100
                              )
                            : Math.round((progress.done / progress.total) * 100)
                        }%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    {progress.phase === "optimizing"
                      ? files.some(isLargeRawImage)
                        ? `Optimizing large photo ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
                        : `Optimizing ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
                      : progress.percent != null
                        ? `Uploading… ${Math.round(((progress.done + progress.percent / 100) / progress.total) * 100)}%`
                        : `Uploading ${progress.done} of ${progress.total}…`}
                  </p>
                </div>
              )}

              {error && (
                <p className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2 text-[12px] text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {error}
                </p>
              )}

              <div className="mt-5 space-y-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Album</p>
                  <select
                    value={albumKey}
                    onChange={(e) => setAlbumKey(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none ring-0 focus-visible:border-primary/50"
                  >
                    {ALBUM_UPLOAD_BUCKETS.map((a) => (
                      <option key={a.key} value={a.key}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Linked trip (optional)
                  </p>
                  <input
                    type="text"
                    value={eventLink}
                    onChange={(e) => setEventLink(e.target.value)}
                    placeholder="e.g. Memorial Day weekend"
                    className="mt-1.5 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none focus-visible:border-primary/50"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Caption</p>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="A quiet note for future-you…"
                    className="mt-1.5 min-h-[88px] rounded-xl border-border/70 bg-background/80 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-border/50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={dismiss} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-xl"
                disabled={files.length === 0 || busy || !user}
                onClick={() => void handleSubmit()}
              >
                <Upload className="opacity-80" data-icon="inline-start" aria-hidden />
                {busy
                  ? progress?.phase === "optimizing"
                    ? files.some(isLargeRawImage)
                      ? "Optimizing large photo…"
                      : "Optimizing…"
                    : "Uploading…"
                  : "Save to archive"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
