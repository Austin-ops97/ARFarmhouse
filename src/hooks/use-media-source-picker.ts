"use client";

import { useCallback, useId, useRef, useState } from "react";

import { IMAGE_FILE_ACCEPT, MOBILE_CAMERA_CAPTURE } from "@/lib/image-file-input";

export type UseMediaSourcePickerOptions = {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  accept?: string;
  sheetOpen?: boolean;
  onSheetOpenChange?: (open: boolean) => void;
};

export function useMediaSourcePicker({
  onFiles,
  multiple = false,
  disabled = false,
  accept = IMAGE_FILE_ACCEPT,
  sheetOpen: sheetOpenProp,
  onSheetOpenChange,
}: UseMediaSourcePickerOptions) {
  const baseId = useId();
  const cameraInputId = `${baseId}-camera`;
  const libraryInputId = `${baseId}-library`;

  const [sheetOpenUncontrolled, setSheetOpenUncontrolled] = useState(false);
  const sheetOpen = sheetOpenProp ?? sheetOpenUncontrolled;
  const setSheetOpen = onSheetOpenChange ?? setSheetOpenUncontrolled;
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const emitFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length || disabled) return;
      const picked = Array.from(list);
      setSheetOpen(false);
      onFiles(multiple ? picked : [picked[0]!]);
    },
    [disabled, multiple, onFiles, setSheetOpen]
  );

  const openPicker = useCallback(() => {
    if (disabled) return;
    setSheetOpen(true);
  }, [disabled]);

  const closePicker = useCallback(() => setSheetOpen(false), []);

  const triggerCamera = useCallback(() => {
    closePicker();
    window.setTimeout(() => cameraInputRef.current?.click(), 0);
  }, [closePicker]);

  const triggerLibrary = useCallback(() => {
    closePicker();
    window.setTimeout(() => libraryInputRef.current?.click(), 0);
  }, [closePicker]);

  const resetInput = useCallback((el: HTMLInputElement | null) => {
    if (el) el.value = "";
  }, []);

  const onCameraChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      emitFiles(e.target.files);
      resetInput(e.target);
    },
    [emitFiles, resetInput]
  );

  const onLibraryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      emitFiles(e.target.files);
      resetInput(e.target);
    },
    [emitFiles, resetInput]
  );

  return {
    accept,
    cameraInputId,
    libraryInputId,
    cameraInputRef,
    libraryInputRef,
    cameraCapture: MOBILE_CAMERA_CAPTURE,
    sheetOpen,
    setSheetOpen,
    openPicker,
    closePicker,
    triggerCamera,
    triggerLibrary,
    onCameraChange,
    onLibraryChange,
    multiple,
    disabled,
  };
}
