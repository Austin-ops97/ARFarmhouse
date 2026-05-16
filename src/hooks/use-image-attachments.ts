"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createPreviewObjectUrl, revokePreviewUrl } from "@/lib/image-preview";
import { isImageFileName } from "@/lib/image-input";
import { uploadStage } from "@/lib/upload-log";
import { validateImageUpload } from "@/platform/security/upload-validation";

export type ImageAttachment = {
  id: string;
  file: File;
  /** null while thumbnail is generating */
  preview: string | null;
};

type UseImageAttachmentsOptions = {
  maxCount: number;
};

export function useImageAttachments({ maxCount }: UseImageAttachmentsOptions) {
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const generationRef = useRef(0);

  const revokeAll = useCallback((items: ImageAttachment[]) => {
    items.forEach((a) => revokePreviewUrl(a.preview));
  }, []);

  const clear = useCallback(() => {
    generationRef.current += 1;
    setAttachments((prev) => {
      revokeAll(prev);
      return [];
    });
  }, [revokeAll]);

  const removeAt = useCallback((index: number) => {
    setAttachments((prev) => {
      const copy = [...prev];
      const [gone] = copy.splice(index, 1);
      if (gone) revokePreviewUrl(gone.preview);
      return copy;
    });
  }, []);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming).filter((f) => {
        if (!f.type.startsWith("image/") && !isImageFileName(f.name)) return false;
        const check = validateImageUpload(f);
        if (!check.ok) {
          uploadStage("reject", { reason: check.reason });
          return false;
        }
        return true;
      });
      if (!list.length) return;

      const gen = ++generationRef.current;
      const newItems: ImageAttachment[] = [];

      setAttachments((prev) => {
        const room = Math.max(0, maxCount - prev.length);
        const toAdd = list.slice(0, room);
        if (!toAdd.length) return prev;

        for (const file of toAdd) {
          newItems.push({ id: crypto.randomUUID(), file, preview: null });
        }
        return [...prev, ...newItems];
      });

      if (!newItems.length) return;

      uploadStage("file selected (attach pipeline)", {
        count: newItems.length,
        names: newItems.map((n) => n.file.name),
      });

      void (async () => {
        for (const item of newItems) {
          if (generationRef.current !== gen) return;
          const preview = await createPreviewObjectUrl(item.file);
          if (generationRef.current !== gen) {
            revokePreviewUrl(preview);
            return;
          }
          setAttachments((prev) =>
            prev.map((a) => (a.id === item.id ? { ...a, preview } : a))
          );
        }
      })();
    },
    [maxCount]
  );

  useEffect(() => {
    return () => {
      generationRef.current += 1;
      setAttachments((prev) => {
        revokeAll(prev);
        return [];
      });
    };
  }, [revokeAll]);

  const files = attachments.map((a) => a.file);

  return {
    attachments,
    files,
    addFiles,
    removeAt,
    clear,
    count: attachments.length,
  };
}
