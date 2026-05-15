"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ImagePlus, Upload, X } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { compressImageFile } from "@/lib/image-compress";
import { validateFeedImageFiles } from "@/lib/feed-publish";
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
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const [albumKey, setAlbumKey] = useState<string>(ALBUM_UPLOAD_BUCKETS[0].key);
  const [caption, setCaption] = useState("");
  const [eventLink, setEventLink] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFiles([]);
    setCaption("");
    setEventLink("");
    setAlbumKey(ALBUM_UPLOAD_BUCKETS[0].key);
    setProgress(null);
    setError(null);
  }, []);

  const onFiles = useCallback((list: FileList | null) => {
    if (!list?.length) return;
    const next: { file: File; preview: string }[] = [];
    Array.from(list).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      next.push({ file, preview: URL.createObjectURL(file) });
    });
    setFiles((prev) => [...prev, ...next].slice(0, 12));
    setError(null);
  }, []);

  const removeAt = (idx: number) => {
    setFiles((prev) => {
      const copy = [...prev];
      const [gone] = copy.splice(idx, 1);
      if (gone) URL.revokeObjectURL(gone.preview);
      return copy;
    });
  };

  const dismiss = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    reset();
    onOpenChange(false);
  }, [files, onOpenChange, reset]);

  const handleSubmit = async () => {
    if (files.length === 0 || !user) return;
    setBusy(true);
    setError(null);
    setProgress({ done: 0, total: files.length });
    try {
      const raw = files.map((f) => f.file);
      validateFeedImageFiles(raw);
      const compressed = await Promise.all(raw.map((f) => compressImageFile(f)));
      await createAlbumMediaItems(
        {
          authorId: user.uid,
          authorDisplayName: displayName || user.displayName || "Family member",
          authorPhotoUrl: avatarUrl ?? user.photoURL ?? null,
          caption,
          albumKey,
          linkedEvent: eventLink.trim() || null,
          files: compressed,
        },
        (done, total) => setProgress({ done, total })
      );
      files.forEach((f) => URL.revokeObjectURL(f.preview));
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
              "ar-modal-shell relative z-10 flex max-h-[min(92dvh,880px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem]",
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
              <label
                htmlFor={inputId}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onFiles(e.dataTransfer.files);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/25 px-4 py-10 text-center transition",
                  "hover:border-primary/35 hover:bg-muted/40"
                )}
              >
                <ImagePlus className="size-8 text-primary/90" aria-hidden />
                <p className="text-sm font-medium text-foreground">Drop images here</p>
                <p className="text-xs text-muted-foreground">or tap to browse — up to 12 stills</p>
                <input
                  id={inputId}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    onFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>

              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {files.map((f, idx) => (
                    <div
                      key={`${f.preview}-${idx}`}
                      className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-border/50"
                    >
                      <Image src={f.preview} alt="" fill className="object-cover" sizes="120px" />
                      <button
                        type="button"
                        onClick={() => removeAt(idx)}
                        className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm"
                        aria-label="Remove"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {progress && busy && (
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Uploading {progress.done} of {progress.total}…
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
                {busy ? "Uploading…" : "Save to archive"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
