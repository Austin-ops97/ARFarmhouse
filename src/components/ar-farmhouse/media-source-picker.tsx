"use client";

import { MediaSourceInputs } from "@/components/ar-farmhouse/media-source-inputs";
import { MediaSourcePickerSheet } from "@/components/ar-farmhouse/media-source-picker-sheet";
import { useMediaSourcePicker } from "@/hooks/use-media-source-picker";

export type MediaSourcePickerProps = {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  sheetOpen: boolean;
  onSheetOpenChange: (open: boolean) => void;
  sheetTitle?: string;
  sheetSubtitle?: string;
  takePhotoLabel?: string;
  uploadLabel?: string;
};

/** Sheet + twin file inputs for avatar and profile photo flows. */
export function MediaSourcePicker({
  onFiles,
  multiple = false,
  disabled = false,
  sheetOpen,
  onSheetOpenChange,
  sheetTitle,
  sheetSubtitle,
  takePhotoLabel,
  uploadLabel,
}: MediaSourcePickerProps) {
  const picker = useMediaSourcePicker({
    onFiles,
    multiple,
    disabled,
    sheetOpen,
    onSheetOpenChange,
  });

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
      <MediaSourcePickerSheet
        open={sheetOpen}
        onOpenChange={onSheetOpenChange}
        onTakePhoto={picker.triggerCamera}
        onUploadFromLibrary={picker.triggerLibrary}
        title={sheetTitle}
        subtitle={sheetSubtitle}
        takePhotoLabel={takePhotoLabel}
        uploadLabel={uploadLabel}
        disabled={disabled}
      />
    </>
  );
}
