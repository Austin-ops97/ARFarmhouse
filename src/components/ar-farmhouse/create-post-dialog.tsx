"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BarChart3, CalendarPlus, Loader2, MapPin, PenLine, Plus, X, XCircle } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { MediaAttachZone } from "@/components/ar-farmhouse/media-attach-zone";
import { useImageAttachments } from "@/hooks/use-image-attachments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { isLargeRawImage } from "@/lib/image-input";
import {
  POLL_OPTION_MAX,
  POLL_OPTION_MIN,
  type FeedPostCategory,
} from "@/models/feed-post-category";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { cn } from "@/lib/utils";

const postTypes: { id: FeedPostCategory; label: string }[] = [
  { id: "memory", label: "Memory" },
  { id: "update", label: "Update" },
  { id: "event", label: "Event" },
  { id: "wildlife", label: "Wildlife" },
  { id: "project", label: "Project" },
  { id: "weekend_recap", label: "Weekend recap" },
];

export type ComposerMode = "standard" | "poll";

export type LivePostPayload = {
  files: File[];
  /** Parallel to `files` — lightweight blob previews for instant optimistic feed rows */
  imagePreviewUrls: (string | null)[];
  caption: string;
  location: string;
  postType: FeedPostCategory;
  attachedEvent: string | null;
};

export type LivePollPayload = {
  question: string;
  options: string[];
  allowMultiple: boolean;
  expiresAt: Date | null;
  location: string;
};

type CreatePostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publishBusy?: boolean;
  publishPhase?: "idle" | "preparing" | "optimizing" | "uploading" | "saving";
  uploadProgress?: { done: number; total: number; percent?: number } | null;
  canPublish?: boolean;
  onPublishLive?: (payload: LivePostPayload) => Promise<void>;
  onPublishPoll?: (payload: LivePollPayload) => Promise<void>;
};

export function CreatePostDialog({
  open,
  onOpenChange,
  publishBusy = false,
  publishPhase = "idle",
  uploadProgress = null,
  canPublish = true,
  onPublishLive,
  onPublishPoll,
}: CreatePostDialogProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  useBodyScrollLock(open);
  const publishingRef = useRef(false);
  const [localPublishing, setLocalPublishing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("standard");
  const { attachments, files, addFiles, removeAt, clear: clearAttachments } = useImageAttachments({
    maxCount: 6,
  });
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [postType, setPostType] = useState<FeedPostCategory>("memory");
  const [linkedEventLabel, setLinkedEventLabel] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [expiresAtLocal, setExpiresAtLocal] = useState("");
  const [publishError, setPublishError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    clearAttachments();
    setCaption("");
    setLocation("");
    setLinkedEventLabel("");
    setPostType("memory");
    setComposerMode("standard");
    setPollQuestion("");
    setPollOptions(["", ""]);
    setAllowMultiple(false);
    setExpiresAtLocal("");
    setDragOver(false);
    setPublishError(null);
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

    if (!canPublish) {
      setPublishError("Wait until sign-in finishes, then try again.");
      return;
    }

    if (composerMode === "poll") {
      if (!onPublishPoll) {
        setPublishError("Sign in to publish to the family feed.");
        return;
      }
      const question = pollQuestion.trim();
      const options = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (!question) {
        setPublishError("Add a poll question.");
        return;
      }
      if (options.length < POLL_OPTION_MIN) {
        setPublishError(`Add at least ${POLL_OPTION_MIN} options.`);
        return;
      }
      if (options.length > POLL_OPTION_MAX) {
        setPublishError(`Polls support up to ${POLL_OPTION_MAX} options.`);
        return;
      }

      let expiresAt: Date | null = null;
      if (expiresAtLocal.trim()) {
        const parsed = new Date(expiresAtLocal);
        if (Number.isNaN(parsed.getTime())) {
          setPublishError("Enter a valid end date and time.");
          return;
        }
        if (parsed.getTime() <= Date.now()) {
          setPublishError("End time must be in the future.");
          return;
        }
        expiresAt = parsed;
      }

      publishingRef.current = true;
      setLocalPublishing(true);
      try {
        await onPublishPoll({
          question,
          options,
          allowMultiple,
          expiresAt,
          location: location.trim(),
        });
        resetForm();
        onOpenChange(false);
      } catch (e) {
        setPublishError(e instanceof Error ? e.message : "Could not publish.");
      } finally {
        publishingRef.current = false;
        setLocalPublishing(false);
      }
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

    const trimmedEvent = linkedEventLabel.trim();

    publishingRef.current = true;
    setLocalPublishing(true);
    try {
      await onPublishLive({
        files,
        imagePreviewUrls: attachments.map((a) => a.preview),
        caption: caption.trim(),
        location: location.trim(),
        postType,
        attachedEvent: trimmedEvent.length ? trimmedEvent : null,
      });
      resetForm();
      onOpenChange(false);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Could not publish.");
    } finally {
      publishingRef.current = false;
      setLocalPublishing(false);
    }
  }, [
    allowMultiple,
    attachments,
    canPublish,
    caption,
    composerMode,
    expiresAtLocal,
    files,
    isPublishing,
    linkedEventLabel,
    location,
    onOpenChange,
    onPublishLive,
    onPublishPoll,
    pollOptions,
    pollQuestion,
    postType,
    resetForm,
  ]);

  useEffect(() => {
    if (open) return;
    queueMicrotask(() => {
      publishingRef.current = false;
      setLocalPublishing(false);
      setPublishError(null);
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

  const hasLargePhotos = files.some(isLargeRawImage);

  const publishLabel =
    composerMode === "poll"
      ? publishPhase === "saving"
        ? "Saving poll"
        : "Publish poll"
      : publishPhase === "preparing" && uploadProgress
        ? uploadProgress.total > 1
          ? `Preparing photos ${uploadProgress.done}/${uploadProgress.total}`
          : "Preparing photo…"
        : publishPhase === "optimizing" && uploadProgress
          ? hasLargePhotos
            ? `Optimizing large photo ${uploadProgress.done}/${uploadProgress.total}`
            : `Optimizing ${uploadProgress.done}/${uploadProgress.total}`
          : publishPhase === "uploading" && uploadProgress
            ? uploadProgress.percent != null
              ? `Uploading ${uploadPercent}%`
              : `Uploading ${uploadProgress.done}/${uploadProgress.total}`
            : publishPhase === "saving"
              ? "Saving post"
              : "Publish";

  const addPollOption = () => {
    if (pollOptions.length >= POLL_OPTION_MAX) return;
    setPollOptions((prev) => [...prev, ""]);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length <= POLL_OPTION_MIN) return;
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  };

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
              <motion.div>
                <p id={titleId} className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  {composerMode === "poll" ? "New poll" : "New post"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {composerMode === "poll"
                    ? "Family votes update live · one vote per person"
                    : "Uploads go to private storage · everyone signed in sees updates live"}
                </p>
              </motion.div>
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
              <p className="text-xs font-medium text-muted-foreground">Format</p>
              <motion.div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => setComposerMode("standard")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    composerMode === "standard"
                      ? "border-primary/40 bg-primary/15 text-foreground"
                      : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/18 hover:text-foreground"
                  )}
                >
                  <PenLine className="size-3.5" aria-hidden />
                  Standard post
                </button>
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => setComposerMode("poll")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    composerMode === "poll"
                      ? "border-primary/40 bg-primary/15 text-foreground"
                      : "border-white/10 bg-white/[0.04] text-muted-foreground hover:border-white/18 hover:text-foreground"
                  )}
                >
                  <BarChart3 className="size-3.5" aria-hidden />
                  Poll
                </button>
              </motion.div>

              {composerMode === "standard" ? (
                <>
                  <p className="mt-5 text-xs font-medium text-muted-foreground">Post type</p>
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
                            <Image src={item.preview} alt="" fill className="object-contain object-center" sizes="120px" unoptimized />
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

                  {(publishPhase === "preparing" ||
                    publishPhase === "optimizing" ||
                    publishPhase === "uploading") &&
                    uploadProgress &&
                    uploadProgress.total > 0 && (
                    <motion.div className="mt-4 space-y-2">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-primary transition-[width] duration-300"
                          style={{
                            width: `${
                              publishPhase === "uploading"
                                ? uploadPercent
                                : publishPhase === "preparing"
                                  ? Math.round((uploadProgress.done / Math.max(uploadProgress.total, 1)) * 28)
                                  : Math.round(
                                      28 +
                                        (uploadProgress.done / Math.max(uploadProgress.total, 1)) * 42
                                    )
                            }%`,
                          }}
                        />
                      </div>
                      <p className="text-center text-xs text-muted-foreground">
                        {publishPhase === "preparing"
                          ? uploadProgress.total > 1
                            ? `Checking & preparing photo ${uploadProgress.done} of ${uploadProgress.total}…`
                            : "Checking photo & preparing optimized upload…"
                          : publishPhase === "optimizing"
                            ? hasLargePhotos
                              ? `Optimizing large photo ${Math.min(uploadProgress.done + 1, uploadProgress.total)} of ${uploadProgress.total}…`
                              : `Optimizing photo ${Math.min(uploadProgress.done + 1, uploadProgress.total)} of ${uploadProgress.total}…`
                            : uploadProgress.percent != null
                              ? `Uploading… ${uploadPercent}%`
                              : `Uploading image ${uploadProgress.done} of ${uploadProgress.total}…`}
                      </p>
                    </motion.div>
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
                </>
              ) : (
                <>
                  <div className="mt-5 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Question</p>
                    <Textarea
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="What should the family vote on?"
                      disabled={isPublishing}
                      className="min-h-[88px] rounded-2xl border-white/10 bg-white/[0.03]"
                      maxLength={200}
                    />
                  </div>

                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">Options</p>
                      <p className="text-[11px] text-muted-foreground/80">
                        {POLL_OPTION_MIN}–{POLL_OPTION_MAX} choices
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {pollOptions.map((opt, i) => (
                        <li key={i} className="flex gap-2">
                          <Input
                            value={opt}
                            onChange={(e) =>
                              setPollOptions((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                            }
                            placeholder={`Option ${i + 1}`}
                            disabled={isPublishing}
                            className="rounded-xl border-white/10 bg-white/[0.03]"
                            maxLength={120}
                          />
                          {pollOptions.length > POLL_OPTION_MIN && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 rounded-xl"
                              disabled={isPublishing}
                              aria-label={`Remove option ${i + 1}`}
                              onClick={() => removePollOption(i)}
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                    {pollOptions.length < POLL_OPTION_MAX && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-1 rounded-xl"
                        disabled={isPublishing}
                        onClick={addPollOption}
                      >
                        <Plus className="mr-1.5 size-3.5" aria-hidden />
                        Add option
                      </Button>
                    )}
                  </div>

                  <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-white/20 accent-primary"
                      checked={allowMultiple}
                      disabled={isPublishing}
                      onChange={(e) => setAllowMultiple(e.target.checked)}
                    />
                    <span className="text-sm text-foreground">Allow multiple choices</span>
                  </label>

                  <div className="mt-5 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">End date (optional)</p>
                    <Input
                      type="datetime-local"
                      value={expiresAtLocal}
                      onChange={(e) => setExpiresAtLocal(e.target.value)}
                      disabled={isPublishing}
                      className="rounded-xl border-white/10 bg-white/[0.03]"
                    />
                  </div>
                </>
              )}

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

              {publishError && (
                <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-100/95">
                  {publishError}
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
                  publishLabel
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
