"use client";

import Image from "next/image";
import { useMemo, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

import {
  feedMediaMaxHeightPx,
  resolveFeedAspectRatio,
  type FeedMediaDims,
} from "@/lib/feed-media-aspect";
import { cn } from "@/lib/utils";

function subscribeViewportHeight(cb: () => void) {
  window.addEventListener("resize", cb, { passive: true });
  return () => window.removeEventListener("resize", cb);
}

function getViewportHeight() {
  return typeof window !== "undefined" ? window.innerHeight : 812;
}

export function useViewportHeightPx() {
  return useSyncExternalStore(subscribeViewportHeight, getViewportHeight, () => 812);
}

function FeedImageLayer({
  src,
  thumbnailSrc,
  alt,
  sizes,
  imageExtraClassName,
  imageProps,
}: {
  src: string;
  thumbnailSrc?: string | null;
  alt: string;
  sizes: string;
  imageExtraClassName?: string;
  imageProps?: Record<string, unknown>;
}) {
  const showThumb = Boolean(thumbnailSrc && thumbnailSrc !== src);

  return (
    <>
      {showThumb ? (
        <Image
          src={thumbnailSrc!}
          alt=""
          aria-hidden
          fill
          sizes={sizes}
          className="pointer-events-none select-none object-cover object-center opacity-90"
          unoptimized
        />
      ) : null}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        loading="lazy"
        draggable={false}
        className={cn(
          "pointer-events-none select-none object-cover object-center bg-muted/20 dark:bg-zinc-950/60",
          imageExtraClassName
        )}
        {...imageProps}
      />
    </>
  );
}

export function FeedMediaFrame({
  src,
  thumbnailSrc,
  alt,
  sizes,
  dims,
  className,
  frameClassName,
  imageExtraClassName,
  imageProps,
  overlay,
  applyParentHeightCap = false,
}: {
  src: string;
  thumbnailSrc?: string | null;
  alt: string;
  sizes: string;
  dims?: FeedMediaDims | null;
  className?: string;
  frameClassName?: string;
  imageExtraClassName?: string;
  imageProps?: Record<string, unknown>;
  overlay?: ReactNode;
  applyParentHeightCap?: boolean;
}) {
  const vhPx = useViewportHeightPx();

  const boxStyle = useMemo((): CSSProperties | undefined => {
    if (applyParentHeightCap) return undefined;
    const ratio = resolveFeedAspectRatio(dims);
    return {
      aspectRatio: String(ratio),
      maxHeight: `${feedMediaMaxHeightPx(dims, vhPx)}px`,
    };
  }, [applyParentHeightCap, dims, vhPx]);

  if (applyParentHeightCap) {
    return (
      <div className={cn("absolute inset-0 h-full min-h-0 w-full min-w-0", frameClassName)}>
        <div className={cn("relative h-full w-full overflow-hidden", className)}>
          <FeedImageLayer
            key={src}
            src={src}
            thumbnailSrc={thumbnailSrc}
            alt={alt}
            sizes={sizes}
            imageExtraClassName={imageExtraClassName}
            imageProps={imageProps}
          />
          {overlay}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full min-w-0 touch-pan-y", frameClassName)}>
      <div className={cn("relative mx-auto flex w-full max-w-full justify-center", className)}>
        <div
          className="ar-feed-media-stable relative w-full max-w-full overflow-hidden"
          style={boxStyle}
        >
          <FeedImageLayer
            key={src}
            src={src}
            thumbnailSrc={thumbnailSrc}
            alt={alt}
            sizes={sizes}
            imageExtraClassName={imageExtraClassName}
            imageProps={imageProps}
          />
          {overlay}
        </div>
      </div>
    </div>
  );
}
