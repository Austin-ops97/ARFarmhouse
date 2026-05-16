"use client";

import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { memo, useCallback, useId } from "react";

import { MediaSourceInputs } from "@/components/ar-farmhouse/media-source-inputs";
import { MediaSourcePickerSheet } from "@/components/ar-farmhouse/media-source-picker-sheet";
import { formatChecklistPercent } from "@/lib/checklist-fields";
import { useMediaSourcePicker } from "@/hooks/use-media-source-picker";
import { cn } from "@/lib/utils";

const cardSurface = cn(
  "rounded-[1.25rem] border border-border/50 bg-card/80 shadow-[var(--ar-float-subtle)] backdrop-blur-sm",
  "dark:border-white/[0.08] dark:bg-white/[0.04]"
);

export type LocalChecklistImage = {
  file: File;
  previewUrl: string;
  uploadProgress?: number;
};

export function createLocalChecklistImage(file: File): LocalChecklistImage {
  return {
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

function ChecklistImageThumb({
  image,
  disabled,
  onReplace,
  onClear,
}: {
  image: LocalChecklistImage;
  disabled?: boolean;
  onReplace: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={onReplace}
        className="relative size-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-border/50 dark:ring-white/10"
        aria-label="Replace photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.previewUrl} alt="" className="size-full object-cover" />
        {typeof image.uploadProgress === "number" && image.uploadProgress < 100 ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/55">
            <Loader2 className="size-4 animate-spin text-primary" />
          </span>
        ) : null}
      </button>
      {onClear ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-background shadow ring-1 ring-border/60 dark:ring-white/15"
          aria-label="Remove photo"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

function ChecklistImageAttachButton({
  label,
  image,
  disabled,
  onPick,
  onClear,
}: {
  label: string;
  image?: LocalChecklistImage | null;
  disabled?: boolean;
  onPick: (file: File) => void;
  onClear?: () => void;
}) {
  const picker = useMediaSourcePicker({
    onFiles: (files) => {
      const file = files[0];
      if (file) onPick(file);
    },
    disabled,
  });

  return (
    <>
      <MediaSourceInputs
        cameraInputId={picker.cameraInputId}
        libraryInputId={picker.libraryInputId}
        cameraInputRef={picker.cameraInputRef}
        libraryInputRef={picker.libraryInputRef}
        disabled={disabled}
        onCameraChange={picker.onCameraChange}
        onLibraryChange={picker.onLibraryChange}
      />
      <MediaSourcePickerSheet
        open={picker.sheetOpen}
        onOpenChange={picker.setSheetOpen}
        onTakePhoto={picker.triggerCamera}
        onUploadFromLibrary={picker.triggerLibrary}
        disabled={disabled}
      />
      {image ? (
        <ChecklistImageThumb image={image} disabled={disabled} onReplace={() => picker.openPicker()} onClear={onClear} />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => picker.openPicker()}
          aria-label={`Add photo for ${label}`}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/55 bg-muted/35 text-muted-foreground transition-colors",
            "hover:border-primary/35 hover:bg-primary/8 hover:text-primary",
            "disabled:opacity-45 dark:border-white/10 dark:bg-white/[0.05]"
          )}
        >
          <Camera className="size-4" strokeWidth={2} />
        </button>
      )}
    </>
  );
}

export const ChecklistSection = memo(function ChecklistSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
      <div className={cn(cardSurface, "divide-y divide-border/45 dark:divide-white/[0.06]")}>{children}</div>
    </section>
  );
});

export const ChecklistSliderRow = memo(function ChecklistSliderRow({
  label,
  value,
  disabled,
  image,
  onValueChange,
  onImagePick,
  onImageClear,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  image?: LocalChecklistImage | null;
  onValueChange: (value: number) => void;
  onImagePick: (file: File) => void;
  onImageClear: () => void;
}) {
  const sliderId = useId();

  return (
    <div className="flex gap-3 px-4 py-4">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-start justify-between gap-3">
          <label htmlFor={sliderId} className="text-[15px] font-semibold text-foreground">
            {label}
          </label>
          <p className="tabular-nums text-sm font-semibold text-primary">{formatChecklistPercent(value)}</p>
        </div>
        <div className="relative pt-1">
          <div
            className="pointer-events-none absolute left-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-primary/25"
            style={{ width: `${value}%` }}
            aria-hidden
          />
          <input
            id={sliderId}
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            disabled={disabled}
            onChange={(e) => onValueChange(Number(e.target.value))}
            className={cn(
              "relative z-10 h-2.5 w-full cursor-pointer appearance-none rounded-full bg-muted/60",
              "[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
              "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary",
              "[&::-webkit-slider-thumb]:shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35)]",
              "[&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
              "[&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-primary",
              "disabled:opacity-45"
            )}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
          />
        </div>
      </div>
      <ChecklistImageAttachButton
        label={label}
        image={image}
        disabled={disabled}
        onPick={onImagePick}
        onClear={onImageClear}
      />
    </div>
  );
});

export const ChecklistToggleRow = memo(function ChecklistToggleRow({
  label,
  subtitle,
  checked,
  disabled,
  image,
  onCheckedChange,
  onImagePick,
  onImageClear,
}: {
  label: string;
  subtitle?: string;
  checked: boolean;
  disabled?: boolean;
  image?: LocalChecklistImage | null;
  onCheckedChange: (checked: boolean) => void;
  onImagePick: (file: File) => void;
  onImageClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-snug text-foreground">{label}</p>
        {subtitle ? <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{subtitle}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-8 w-[3.25rem] shrink-0 rounded-full border transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 disabled:opacity-45",
          checked
            ? "border-primary/40 bg-primary/90"
            : "border-border/80 bg-muted/50 dark:border-white/[0.08] dark:bg-white/[0.06]"
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-6 -translate-y-1/2 rounded-full bg-background shadow-sm ring-1 ring-border/50 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-zinc-100 dark:ring-white/10",
            checked ? "left-[calc(100%-1.65rem)]" : "left-1"
          )}
        />
      </button>
      <ChecklistImageAttachButton
        label={label}
        image={image}
        disabled={disabled}
        onPick={onImagePick}
        onClear={onImageClear}
      />
    </div>
  );
});

export const ChecklistMediaUploadCard = memo(function ChecklistMediaUploadCard({
  label,
  required,
  image,
  disabled,
  onImagePick,
  onImageClear,
}: {
  label: string;
  required?: boolean;
  image?: LocalChecklistImage | null;
  disabled?: boolean;
  onImagePick: (file: File) => void;
  onImageClear: () => void;
}) {
  const picker = useMediaSourcePicker({
    onFiles: (files) => {
      const file = files[0];
      if (file) onImagePick(file);
    },
    disabled,
  });

  return (
    <section className="space-y-3">
      <div className={cn(cardSurface, "p-4 ring-1 ring-primary/15 dark:ring-primary/20")}>
        <MediaSourceInputs
          cameraInputId={picker.cameraInputId}
          libraryInputId={picker.libraryInputId}
          cameraInputRef={picker.cameraInputRef}
          libraryInputRef={picker.libraryInputRef}
          disabled={disabled}
          onCameraChange={picker.onCameraChange}
          onLibraryChange={picker.onLibraryChange}
        />
        <MediaSourcePickerSheet
          open={picker.sheetOpen}
          onOpenChange={picker.setSheetOpen}
          onTakePhoto={picker.triggerCamera}
          onUploadFromLibrary={picker.triggerLibrary}
          disabled={disabled}
        />
        <div className="mb-3">
          <p className="text-[15px] font-semibold text-foreground">{label}</p>
          {required ? <p className="mt-0.5 text-sm text-muted-foreground">Photo required before submit</p> : null}
        </div>
        {image ? (
          <div className="relative overflow-hidden rounded-2xl ring-1 ring-border/50 dark:ring-white/10">
            <button type="button" disabled={disabled} onClick={() => picker.openPicker()} className="block w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.previewUrl} alt="" className="aspect-[4/3] w-full object-cover" />
              {typeof image.uploadProgress === "number" && image.uploadProgress < 100 ? (
                <span className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </span>
              ) : null}
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onImageClear}
              className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-background/90 shadow ring-1 ring-border/50 backdrop-blur-sm dark:ring-white/10"
              aria-label="Remove photo"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => picker.openPicker()}
            className={cn(
              "flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 bg-primary/5 px-4 py-6 transition-colors",
              "hover:border-primary/50 hover:bg-primary/8 disabled:opacity-45 dark:border-primary/25 dark:bg-primary/10"
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <ImagePlus className="size-6" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-semibold text-foreground">Tap to add photo</span>
            <span className="text-xs text-muted-foreground">Camera or photo library</span>
          </button>
        )}
      </div>
    </section>
  );
});

export function useChecklistImageHandlers(
  images: Partial<Record<string, LocalChecklistImage>>,
  setImages: React.Dispatch<React.SetStateAction<Partial<Record<string, LocalChecklistImage>>>>
) {
  const onPick = useCallback(
    (field: string, file: File) => {
      setImages((prev) => {
        const existing = prev[field];
        if (existing?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(existing.previewUrl);
        return { ...prev, [field]: createLocalChecklistImage(file) };
      });
    },
    [setImages]
  );

  const onClear = useCallback(
    (field: string) => {
      setImages((prev) => {
        const existing = prev[field];
        if (existing?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(existing.previewUrl);
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [setImages]
  );

  return { onPick, onClear };
}
