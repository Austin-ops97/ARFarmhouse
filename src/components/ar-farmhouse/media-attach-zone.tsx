"use client";

import { Camera, ImagePlus, Images } from "lucide-react";

import { AttachActionButton } from "@/components/ar-farmhouse/media-attach-actions";
import { MediaSourceInputs } from "@/components/ar-farmhouse/media-source-inputs";
import { useMediaSourcePicker } from "@/hooks/use-media-source-picker";
import { cn } from "@/lib/utils";

export type MediaAttachZoneProps = {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
  hint?: string;
  dragOver?: boolean;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  showDesktopDropHint?: boolean;
};

export function MediaAttachZone({
  onFiles,
  multiple = true,
  disabled = false,
  className,
  title = "Add photos",
  hint = "HD quality preserved · prepared automatically before upload",
  dragOver,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  showDesktopDropHint = false,
}: MediaAttachZoneProps) {
  const picker = useMediaSourcePicker({ onFiles, multiple, disabled });

  return (
    <>
      <MediaSourceInputs
        cameraInputId={picker.cameraInputId}
        libraryInputId={picker.libraryInputId}
        cameraInputRef={picker.cameraInputRef}
        libraryInputRef={picker.libraryInputRef}
        accept={picker.accept}
        multiple={picker.multiple}
        disabled={picker.disabled}
        onCameraChange={picker.onCameraChange}
        onLibraryChange={picker.onLibraryChange}
      />
      <div
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center transition-colors",
          dragOver ? "border-primary/50 bg-primary/10" : "border-white/15 bg-white/[0.03]",
          disabled && "pointer-events-none opacity-60",
          className
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
          <ImagePlus className="size-5 text-primary" aria-hidden />
        </span>
        <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">{hint}</p>
        <MediaAttachActionRow
          disabled={disabled}
          onTakePhoto={() => picker.cameraInputRef.current?.click()}
          onUploadFromLibrary={() => picker.libraryInputRef.current?.click()}
        />
        {showDesktopDropHint ? (
          <p className="mt-3 hidden text-[11px] text-muted-foreground sm:block">Or drag images here on desktop</p>
        ) : null}
      </div>
    </>
  );
}

function MediaAttachActionRow({
  disabled,
  onTakePhoto,
  onUploadFromLibrary,
}: {
  disabled: boolean;
  onTakePhoto: () => void;
  onUploadFromLibrary: () => void;
}) {
  return (
    <div className="mt-4 grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
      <AttachActionButton
        icon={Camera}
        label="Take Photo"
        disabled={disabled}
        onClick={onTakePhoto}
        ariaLabel="Take photo with camera"
      />
      <AttachActionButton
        icon={Images}
        label="Upload From Library"
        disabled={disabled}
        onClick={onUploadFromLibrary}
        ariaLabel="Upload from photo library"
      />
    </div>
  );
}
