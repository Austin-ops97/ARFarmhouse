"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarPlus, ImagePlus, Loader2, MapPin, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

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
  publishPhase?: "idle" | "uploading" | "saving";
  uploadProgress?: { done: number; total: number } | null;
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
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [postType, setPostType] = useState<FeedPostCategory>("memory");
  const [linkedEventLabel, setLinkedEventLabel] = useState("");
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const revokeUrls = useCallback((urls: string[]) => {
    urls.forEach((u) => {
      if (u.startsWith("blob:")) URL.revokeObjectURL(u);
    });
  }, []);

  const resetForm = useCallback(() => {
    setPreviews((prev) => {
      revokeUrls(prev);
      return [];
    });
    setFiles([]);
    setCaption("");
    setLocation("");
    setLinkedEventLabel("");
    setPostType("memory");
    setDragOver(false);
    setPublishError(null);
    setPublishSuccess(false);
  }, [revokeUrls]);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming).filter((f) => f.type.startsWith("image/")).slice(0, 6);
      setFiles(list);
      setPreviews((prev) => {
        revokeUrls(prev);
        return list.map((f) => URL.createObjectURL(f));
      });
    },
    [revokeUrls]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const closeDialog = useCallback(() => {
    if (publishBusy) return;
    resetForm();
    onOpenChange(false);
  }, [onOpenChange, publishBusy, resetForm]);

  const handlePublish = useCallback(async () => {
    if (publishingRef.current || publishBusy) return;
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
      window.setTimeout(() => {
        resetForm();
        onOpenChange(false);
      }, 400);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Could not publish.");
    } finally {
      publishingRef.current = false;
    }
  }, [canPublish, caption, files, linkedEventLabel, location, onOpenChange, onPublishLive, postType, publishBusy, resetForm]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !publishBusy) closeDialog();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeDialog, publishBusy]);

  const publishLabel =
    publishPhase === "uploading" && uploadProgress
      ? `Uploading ${uploadProgress.done}/${uploadProgress.total}`
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
            disabled={publishBusy}
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
              "relative z-10 flex max-h-[min(92dvh,900px)] w-full max-w-xl flex-col overflow-hidden rounded-t-[1.75rem] border border-white/12",
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
                disabled={publishBusy}
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
                      disabled={publishBusy}
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

              <motion.div
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
                className={cn(
                  "mt-5 flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center transition-colors",
                  dragOver ? "border-primary/50 bg-primary/10" : "border-white/15 bg-white/[0.03] hover:border-white/22",
                  publishBusy && "pointer-events-none opacity-60"
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  id="ar-create-post-files"
                  disabled={publishBusy}
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                />
                <label htmlFor="ar-create-post-files" className="flex cursor-pointer flex-col items-center gap-2">
                  <span className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                    <ImagePlus className="size-5 text-primary" aria-hidden />
                  </span>
                  <span className="text-sm font-medium text-foreground">Drop images here</span>
                  <span className="text-xs text-muted-foreground">or tap to browse · JPEG / PNG / WebP · max 10 MB each</span>
                </label>
              </motion.div>

              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {previews.map((src) => (
                    <div key={src} className="relative aspect-square overflow-hidden rounded-xl border border-white/10">
                      <Image src={src} alt="" fill className="object-cover" sizes="120px" />
                    </div>
                  ))}
                </div>
              )}

              {publishPhase === "uploading" && uploadProgress && uploadProgress.total > 0 && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Uploading image {uploadProgress.done} of {uploadProgress.total}…
                </p>
              )}

              <div className="mt-5 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Caption</p>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="What happened today?"
                  disabled={publishBusy}
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
                  disabled={publishBusy}
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
                  disabled={publishBusy}
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
              <Button type="button" variant="outline" className="rounded-xl" onClick={closeDialog} disabled={publishBusy}>
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                onClick={() => void handlePublish()}
                disabled={publishBusy || !canPublish}
              >
                {publishBusy ? (
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
