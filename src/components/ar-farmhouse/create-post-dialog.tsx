"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarPlus, ImagePlus, MapPin, Users, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { demoAttachableEvents, demoFamilyMembers, type DemoPostCategory } from "@/lib/social-demo";
import { cn } from "@/lib/utils";

const postTypes: { id: DemoPostCategory; label: string }[] = [
  { id: "memory", label: "Memory" },
  { id: "update", label: "Update" },
  { id: "event", label: "Event" },
  { id: "wildlife", label: "Wildlife" },
  { id: "project", label: "Project" },
  { id: "weekend_recap", label: "Weekend recap" },
];

type CreatePostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreatePostDialog({ open, onOpenChange }: CreatePostDialogProps) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [postType, setPostType] = useState<DemoPostCategory>("memory");
  const [tagged, setTagged] = useState<string[]>([]);
  const [attachedEvent, setAttachedEvent] = useState<string | null>(null);

  const revokeUrls = useCallback((urls: string[]) => {
    urls.forEach((u) => {
      if (u.startsWith("blob:")) URL.revokeObjectURL(u);
    });
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, 6);
      const urls = list.map((f) => URL.createObjectURL(f));
      setPreviews((prev) => {
        revokeUrls(prev);
        return urls;
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

  const toggleTag = (id: string) => {
    setTagged((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const closeDialog = useCallback(() => {
    setPreviews((prev) => {
      prev.forEach((u) => {
        if (u.startsWith("blob:")) URL.revokeObjectURL(u);
      });
      return [];
    });
    setCaption("");
    setLocation("");
    setTagged([]);
    setAttachedEvent(null);
    setPostType("memory");
    setDragOver(false);
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDialog();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeDialog]);

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
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p id={titleId} className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  New post
                </p>
                <p className="text-xs text-muted-foreground">Private to family · demo preview only</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeDialog} aria-label="Close">
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <p className="text-xs font-medium text-muted-foreground">Post type</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {postTypes.map((t) => {
                  const active = postType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
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

              <div
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
                  dragOver ? "border-primary/50 bg-primary/10" : "border-white/15 bg-white/[0.03] hover:border-white/22"
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  id="ar-create-post-files"
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                />
                <label htmlFor="ar-create-post-files" className="flex cursor-pointer flex-col items-center gap-2">
                  <span className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                    <ImagePlus className="size-5 text-primary" aria-hidden />
                  </span>
                  <span className="text-sm font-medium text-foreground">Drop images here</span>
                  <span className="text-xs text-muted-foreground">or tap to browse · mock upload, stays on device</span>
                </label>
              </div>

              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {previews.map((src) => (
                    <div key={src} className="relative aspect-square overflow-hidden rounded-xl border border-white/10">
                      <Image src={src} alt="" fill className="object-cover" sizes="120px" />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Caption</p>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Share the moment — tone is warm, specifics welcome."
                  className="min-h-[100px] rounded-2xl border-white/10 bg-white/[0.03]"
                />
              </div>

              <div className="mt-5 space-y-2">
                <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Users className="size-3.5" aria-hidden />
                  Tag family
                </p>
                <div className="flex flex-wrap gap-2">
                  {demoFamilyMembers.map((m) => {
                    const on = tagged.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleTag(m.id)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          on
                            ? "border-primary/40 bg-primary/15 text-foreground"
                            : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/18"
                        )}
                      >
                        <span className="relative inline-block size-6 shrink-0 overflow-hidden rounded-full border border-white/10">
                          <Image src={m.avatar} alt="" fill className="object-cover" sizes="24px" />
                        </span>
                        {m.name.split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden />
                  Location
                </p>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="AR Farmhouse · North camera"
                  className="rounded-xl border-white/10 bg-white/[0.03]"
                />
              </div>

              <div className="mt-5 space-y-2">
                <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <CalendarPlus className="size-3.5" aria-hidden />
                  Attach weekend / event
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setAttachedEvent(null)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                      attachedEvent === null
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/18"
                    )}
                  >
                    None
                  </button>
                  {demoAttachableEvents.map((ev) => {
                    const active = attachedEvent === ev;
                    return (
                      <button
                        key={ev}
                        type="button"
                        onClick={() => setAttachedEvent(ev)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                          active
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/18"
                        )}
                      >
                        {ev}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-background/80 px-5 py-4 backdrop-blur-xl">
              <Button type="button" variant="outline" className="rounded-xl" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="button" className="rounded-xl" onClick={closeDialog}>
                Post preview
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
