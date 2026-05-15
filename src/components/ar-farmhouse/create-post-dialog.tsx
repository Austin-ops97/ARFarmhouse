"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarPlus, Loader2, MapPin, X, XCircle } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { MediaAttachZone } from "@/components/ar-farmhouse/media-attach-zone";
import { useImageAttachments } from "@/hooks/use-image-attachments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FeedPostCategory } from "@/models/feed-post-category";
import { cn } from "@/lib/utils";

const postTypes: { id: FeedPostCategory; label: string }[] = [
  { id: "memory", label: "Memory" },
  { id: "update", label: "Update" },
  { id: "event", label: "Event" },
  { id: "wildlife", label: "Wildlife" },
  { id: "project", label: "Project" },
  { id: "weekend_recap", label: "Weekend recap" },
];

export type LivePostPayload = {
  files: File[];
  caption: string;
  location: string;
  postType: FeedPostCategory;
  attachedEvent: string | null;
};

type CreatePostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publishBusy?: boolean;
  publishPhase?: "idle" | "optimizing" | "uploading" | "saving";
  uploadProgress?: { done: number; total: number; percent?: number } | null;
  canPublish?: boolean;
  onPublishLive?: (payload: LivePostPayload) => Promise<void>;
};

export function CreatePostDialog({
  open,
  onOpenChange,
  publishBusy = false,
  publishPhase = "idle",
  uploadProgress = null,
  canPublish = true,
  onPublishLive,
}: CreatePostDialogProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const publishingRef = useRef(false);
  const closeAfterSuccessRef = useRef<number | null>(null);
  const [localPublishing, setLocalPublishing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { attachments, files, addFiles, removeAt, clear: clearAttachments } = useImageAttachments({
    maxCount: 6,
  });
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [postType, setPostType] = useState<FeedPostCategory>("memory");
  const [linkedEventLabel, setLinkedEventLabel] = useState("");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const resetForm = useCallback(() => {
    clearAttachments();
    setCaption("");
    setLocation("");
    setLinkedEventLabel("");
    setPostType("memory");
    setDragOver(false);
    setPublishError(null);
    setPublishSuccess(false);
  }, [clearAttachments]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const isPublishing = localPublishing || publishBusy;

  const closeDialog = useCallback(() => {
    if (isPublishing) return;
    resetForm();
    onOpenChange(false);
  }, [isPublishing, onOpenChange, resetForm]);

  const handlePublish = useCallback(async () => {
    if (publishingRef.current || isPublishing) return;
    setPublishError(null);
    setPublishSuccess(false);

    if (!canPublish) {
      setPublishError("Wait until sign-in finishes, then try again.");
      return;
    }
    if (!onPublishLive) {
      setPublishError("Sign in to publish to the family feed.");
      return;
    }
    if (!caption.trim() && files.length === 0) {
      setPublishError("Add a caption or at least one image.");
      return;
    }

    publishingRef.current = true;
    setLocalPublishing(true);
    try {
      const trimmedEvent = linkedEventLabel.trim();
      await onPublishLive({
        files,
        caption: caption.trim(),
        location: location.trim(),
        postType,
        attachedEvent: trimmedEvent.length ? trimmedEvent : null,
      });
      setPublishSuccess(true);
      closeAfterSuccessRef.current = window.setTimeout(() => {
        closeAfterSuccessRef.current = null;
        resetForm();
        onOpenChange(false);
      }, 320);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Could not publish.");
    } finally {
      publishingRef.current = false;
      setLocalPublishing(false);
    }
  }, [canPublish, caption, files, isPublishing, linkedEventLabel, location, onOpenChange, onPublishLive, postType, resetForm]);

  useEffect(() => {
    if (open) return;
    if (closeAfterSuccessRef.current != null) {
      window.clearTimeout(closeAfterSuccessRef.current);
      closeAfterSuccessRef.current = null;
    }
    queueMicrotask(() => {
      publishingRef.current = false;
      setLocalPublishing(false);
      setPublishError(null);
      setPublishSuccess(false);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPublishing) closeDialog();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeDialog, isPublishing]);

  const uploadPercent =
    uploadProgress && uploadProgress.total > 0
      ? Math.round(
          ((uploadProgress.done + (uploadProgress.percent ?? 0) / 100) / uploadProgress.total) * 100
        )
      : 0;

  const publishLabel =
    publishPhase === "optimizing" && uploadProgress
      ? `Optimizing ${uploadProgress.done}/${uploadProgress.total}`
      : publishPhase === "uploading" && uploadProgress
        ? uploadProgress.percent != null
          ? `Uploading ${uploadPercent}%`
          : `Uploading ${uploadProgress.done}/${uploadProgress.total}`
        : publishPhase === "saving"
          ? "Saving post"
          : "Publish";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.25 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-xl"
            aria-label="Close"
            onClick={closeDialog}
            disabled={isPublishing}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { y: 18, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className={cn(
              "ar-modal-shell relative z-10 flex max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-bottom,0px)))] w-full max-w-xl min-h-0 flex-col overflow-hidden rounded-t-[1.75rem] border border-white/12 sm:max-h-[min(92dvh,900px)]",
              "bg-background/90 shadow-[0_40px_120px_-48px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:rounded-[1.75rem]"
            )}
          >
            <motion.div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p id={titleId} className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  New post
                </p>
                <p className="text-xs text-muted-foreground">
                  Uploads go to private storage · everyone signed in sees updates live
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeDialog}
                disabled={isPublishing}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
            </motion.div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <p className="text-xs font-medium text-muted-foreground">Post type</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {postTypes.map((t) => {
                  const active = postType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={isPublishing}
                      onClick={() => setPostType(t.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary/40 bg-primary/15 text-foreground"
                          : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/18 hover:text-foreground"
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <MediaAttachZone
                className="mt-5 hover:border-white/22"
                disabled={isPublishing}
                multiple
                showDesktopDropHint
                title="Add photos to your post"
                hint="Take a quick shot or pick from your library · HD quality preserved"
                dragOver={dragOver}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onFiles={addFiles}
              />

              {attachments.length > 0 && (
                <motion.div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {attachments.map((item, i) => (
                    <motion.div
                      key={item.id}
                      className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]"
                    >
                      {item.preview ? (
                        <Image src={item.preview} alt="" fill className="object-cover" sizes="120px" unoptimized />
                      ) : (
                        <motion.div className="absolute inset-0 animate-pulse bg-white/[0.08]" aria-hidden />
                      )}
                      {!isPublishing && (
                        <button
                          type="button"
                          className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 text-foreground shadow"
                          aria-label="Remove image"
                          onClick={() => removeAt(i)}
                        >
                          <XCircle className="size-4" aria-hidden />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {(publishPhase === "optimizing" || publishPhase === "uploading") &&
                uploadProgress &&
                uploadProgress.total > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{
                        width: `${
                          publishPhase === "uploading"
                            ? uploadPercent
                            : Math.round((uploadProgress.done / uploadProgress.total) * 100)
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    {publishPhase === "optimizing"
                      ? `Optimizing photo ${Math.min(uploadProgress.done + 1, uploadProgress.total)} of ${uploadProgress.total}…`
                      : uploadProgress.percent != null
                        ? `Uploading… ${uploadPercent}%`
                        : `Uploading image ${uploadProgress.done} of ${uploadProgress.total}…`}
                  </p>
                </div>
              )}

              <div className="mt-5 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Caption</p>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What happened today?"
                  disabled={isPublishing}
                  className="min-h-[100px] rounded-2xl border-white/10 bg-white/[0.03]"
                />
              </div>

              <div className="mt-5 space-y-2">
                <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden />
                  Location
                </p>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Optional — e.g. porch, north field, kitchen"
                  disabled={isPublishing}
                  className="rounded-xl border-white/10 bg-white/[0.03]"
                />
              </div>

              <div className="mt-5 space-y-2">
                <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <CalendarPlus className="size-3.5" aria-hidden />
                  Linked event (optional)
                </p>
                <Input
                  value={linkedEventLabel}
                  onChange={(e) => setLinkedEventLabel(e.target.value)}
                  placeholder="e.g. Memorial Day weekend — ties this post to a hub when it matches"
                  disabled={isPublishing}
                  className="rounded-xl border-white/10 bg-white/[0.03]"
                />
              </div>

              {publishError && (
                <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-100/95">
                  {publishError}
                </p>
              )}
              {publishSuccess && (
                <p className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-100/95">
                  Posted — syncing to the family feed…
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-background/80 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:pb-4">
              <Button type="button" variant="outline" className="rounded-xl" onClick={closeDialog} disabled={isPublishing}>
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                onClick={() => void handlePublish()}
                disabled={isPublishing || !canPublish}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    {publishLabel}
                  </>
                ) : (
                  "Publish"
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
