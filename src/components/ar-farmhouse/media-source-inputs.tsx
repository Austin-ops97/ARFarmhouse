"use client";

import type { RefObject } from "react";

import { IMAGE_FILE_ACCEPT, MOBILE_CAMERA_CAPTURE } from "@/lib/image-file-input";

export type MediaSourceInputsProps = {
  cameraInputId: string;
  libraryInputId: string;
  cameraInputRef: RefObject<HTMLInputElement | null>;
  libraryInputRef: RefObject<HTMLInputElement | null>;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onCameraChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLibraryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

/** Hidden twin inputs: camera (`capture=environment`) vs library (no capture). */
export function MediaSourceInputs({
  cameraInputId,
  libraryInputId,
  cameraInputRef,
  libraryInputRef,
  accept = IMAGE_FILE_ACCEPT,
  multiple = false,
  disabled = false,
  onCameraChange,
  onLibraryChange,
}: MediaSourceInputsProps) {
  return (
    <>
      <input
        ref={cameraInputRef}
        id={cameraInputId}
        type="file"
        accept={accept}
        capture={MOBILE_CAMERA_CAPTURE}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onCameraChange}
      />
      <input
        ref={libraryInputRef}
        id={libraryInputId}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onLibraryChange}
      />
    </>
  );
}
