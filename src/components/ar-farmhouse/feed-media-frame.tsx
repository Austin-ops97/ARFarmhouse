"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import {
  feedMediaImageFitClass,
  type FeedMediaDims,
  type FeedMediaRenderContext,
} from "@/lib/feed-media-aspect";
import { useLockedFeedMediaLayout } from "@/lib/use-locked-feed-media-layout";
import { cn } from "@/lib/utils";

function FeedImageLayer({
  src,
  thumbnailSrc,
  alt,
  sizes,
  layoutDims,
  fitDims,
  renderContext,
  imageExtraClassName,
  imageProps,
}: {
  src: string;
  thumbnailSrc?: string | null;
  alt: string;
  sizes: string;
  layoutDims: FeedMediaDims;
  fitDims?: FeedMediaDims | null;
  renderContext: FeedMediaRenderContext;
  imageExtraClassName?: string;
  imageProps?: Record<string, unknown>;
}) {
  const showThumb = Boolean(thumbnailSrc && thumbnailSrc !== src);
  const { width, height } = layoutDims;
  const fitClass = feedMediaImageFitClass(fitDims ?? layoutDims, renderContext);

  return (
    <>
      {showThumb ? (
        <Image
          src={thumbnailSrc!}
          alt=""
          aria-hidden
          fill
          width={width}
          height={height}
          sizes={sizes}
          className={cn("pointer-events-none select-none", fitClass)}
          unoptimized
        />
      ) : null}
      <Image
        src={src}
        alt={alt}
        fill
        width={width}
        height={height}
        sizes={sizes}
        loading="lazy"
        draggable={false}
        className={cn(
          "pointer-events-none select-none bg-muted/20 dark:bg-zinc-950/60",
          fitClass,
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
  parentLayoutDims,
  renderContext = "standalone",
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
  /** When parent owns the box (carousel/grid), pass its locked dims for intrinsic image sizing. */
  parentLayoutDims?: FeedMediaDims | null;
  renderContext?: FeedMediaRenderContext;
}) {
  const locked = useLockedFeedMediaLayout(parentLayoutDims ?? dims);
  const layoutDims = parentLayoutDims ?? locked.layoutDims;
  const boxStyle = applyParentHeightCap ? undefined : locked.boxStyle;
  const fitContext: FeedMediaRenderContext = applyParentHeightCap ? "embedded" : renderContext;

  if (applyParentHeightCap) {
    return (
      <div className={cn("absolute inset-0 h-full min-h-0 w-full min-w-0", frameClassName)}>
        <div className={cn("relative h-full w-full overflow-hidden", className)}>
          <FeedImageLayer
            src={src}
            thumbnailSrc={thumbnailSrc}
            alt={alt}
            sizes={sizes}
            layoutDims={layoutDims}
            fitDims={dims}
            renderContext={fitContext}
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
            src={src}
            thumbnailSrc={thumbnailSrc}
            alt={alt}
            sizes={sizes}
            layoutDims={layoutDims}
            fitDims={dims}
            renderContext={fitContext}
            imageExtraClassName={imageExtraClassName}
            imageProps={imageProps}
          />
          {overlay}
        </div>
      </div>
    </div>
  );
}
