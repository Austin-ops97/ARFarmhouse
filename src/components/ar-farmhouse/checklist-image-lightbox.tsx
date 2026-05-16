"use client";

import { useReducedMotion } from "framer-motion";

import { FeedMediaLightbox, type FeedMediaLightboxState } from "@/components/ar-farmhouse/feed-media-lightbox";

type ChecklistImageLightboxProps = {
  url: string | null;
  onClose: () => void;
};

export function ChecklistImageLightbox({ url, onClose }: ChecklistImageLightboxProps) {
  const reduceMotion = useReducedMotion();
  const state: FeedMediaLightboxState = url ? { urls: [url], index: 0 } : null;

  return (
    <FeedMediaLightbox
      state={state}
      onClose={onClose}
      onPrev={() => {}}
      onNext={() => {}}
      reduceMotion={reduceMotion}
    />
  );
}
