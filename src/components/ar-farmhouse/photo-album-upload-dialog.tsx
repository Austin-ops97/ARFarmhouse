"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ImagePlus, Link2, X } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_ALBUM_LABELS, type AlbumMediaItem } from "@/lib/photo-album-media";
import { demoAttachableEvents } from "@/lib/social-demo";
import { cn } from "@/lib/utils";

async function compressToDataUrl(file: File, maxEdge = 960, quality = 0.74): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

type PhotoAlbumUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommit: (items: AlbumMediaItem[]) => void;
};

export function PhotoAlbumUploadDialog({ open, onOpenChange, onCommit }: PhotoAlbumUploadDialogProps) {
  const reduceMotion = useReducedMotion();
  const inputId = useId();
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const [albumKey, setAlbumKey] = useState<string>(MOCK_ALBUM_LABELS[0].key);
  const [caption, setCaption] = useState("");
  const [eventLink, setEventLink] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => {
    setFiles([]);
    setCaption("");
    setEventLink("");
    setAlbumKey(MOCK_ALBUM_LABELS[0].key);
  }, []);

  const onFiles = useCallback((list: FileList | null) => {
    if (!list?.length) return;
    const next: { file: File; preview: string }[] = [];
    Array.from(list).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      next.push({ file, preview: URL.createObjectURL(file) });
    });
    setFiles((prev) => [...prev, ...next].slice(0, 12));
  }, []);

  const removeAt = (idx: number) => {
    setFiles((prev) => {
      const copy = [...prev];
      const [gone] = copy.splice(idx, 1);
      if (gone) URL.revokeObjectURL(gone.preview);
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    setBusy(true);
    try {
      const items: AlbumMediaItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const { file } = files[i];
        const src = await compressToDataUrl(file);
        items.push({
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `up-${Date.now()}-${i}`,
          src,
          caption: caption.trim() || "Added from your device",
          source: "upload",
          albumKey,
          linkedEvent: eventLink ? String(eventLink) : undefined,
          addedAt: Date.now(),
          postTitle: MOCK_ALBUM_LABELS.find((a) => a.key === albumKey)?.label,
        });
      }
      onCommit(items);
      files.forEach((f) => URL.revokeObjectURL(f.preview));
      reset();
      onOpenChange(false);
    } finally {
      setBusy(false);
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
          <button
            type="button"
            className="absolute inset-0 bg-background/75 backdrop-blur-xl"
            aria-label="Dismiss"
            onClick={() => {
              files.forEach((f) => URL.revokeObjectURL(f.preview));
              reset();
              onOpenChange(false);
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${inputId}-title`}
            initial={reduceMotion ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className={cn(
              "relative z-10 flex max-h-[min(92dvh,880px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-border/60",
              "bg-card/95 shadow-[0_40px_120px_-48px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:rounded-[1.75rem]"
            )}
          >
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <div>
                <p id={`${inputId}-title`} className="font-heading text-base font-semibold tracking-tight text-foreground">
                  Add to album
                </p>
                <p className="text-[11px] text-muted-foreground">Stored privately on this device in demo</p>
              </div>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/50 transition hover:bg-muted/60"
                onClick={() => {
                  files.forEach((f) => URL.revokeObjectURL(f.preview));
                  reset();
                  onOpenChange(false);
                }}
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
                    <div key={`${f.preview}-${idx}`} className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-border/50">
                      <Image src={f.preview} alt="" fill className="object-cover transition duration-500 group-hover:scale-[1.04]" sizes="120px" />
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

              <div className="mt-5 space-y-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Album</p>
                  <select
                    value={albumKey}
                    onChange={(e) => setAlbumKey(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none ring-0 focus-visible:border-primary/50"
                  >
                    {MOCK_ALBUM_LABELS.map((a) => (
                      <option key={a.key} value={a.key}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Linked event (optional)</p>
                  <select
                    value={eventLink}
                    onChange={(e) => setEventLink(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none focus-visible:border-primary/50"
                  >
                    <option value="">None</option>
                    {demoAttachableEvents.map((ev) => (
                      <option key={ev} value={ev}>
                        {ev}
                      </option>
                    ))}
                  </select>
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
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" className="flex-1 rounded-xl" disabled={files.length === 0 || busy} onClick={() => void handleSubmit()}>
                <Link2 className="opacity-80" data-icon="inline-start" aria-hidden />
                {busy ? "Saving…" : "Save to album"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
