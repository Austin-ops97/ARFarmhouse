"use client";

import Image from "next/image";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  computeFeedMediaDisplaySize,
  mediaOrientation,
  viewportMaxFeedMediaHeight,
  type FeedMediaDims,
} from "@/lib/feed-media-aspect";
import { FEED_STREAM_MAX_WIDTH_PX } from "@/lib/feed-layout";
import { cn } from "@/lib/utils";

function FeedDecodedImageLayer({
  src,
  thumbnailSrc,
  alt,
  sizes,
  imageExtraClassName,
  imageProps,
  onLoadingComplete,
}: {
  src: string;
  thumbnailSrc?: string | null;
  alt: string;
  sizes: string;
  imageExtraClassName?: string;
  imageProps?: Record<string, unknown>;
  onLoadingComplete: (img: HTMLImageElement) => void;
}) {
  const [visible, setVisible] = useState(false);
  const showThumb = Boolean(thumbnailSrc && thumbnailSrc !== src && !visible);

  return (
    <>
      {showThumb ? (
        <Image
          src={thumbnailSrc!}
          alt=""
          aria-hidden
          fill
          sizes={sizes}
          className="select-none object-cover object-center blur-md scale-105 opacity-80"
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
          "select-none bg-muted/20 object-contain object-center dark:bg-zinc-950/60",
          "transition-opacity duration-[300ms] ease-out motion-reduce:opacity-100 motion-reduce:transition-none",
          visible ? "opacity-100" : "opacity-0",
          imageExtraClassName
        )}
        onLoadingComplete={(img) => {
          onLoadingComplete(img);
          setVisible(true);
        }}
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
  /** Thumb URL for progressive blur-up when backend variants exist. */
  thumbnailSrc?: string | null;
  alt: string;
  sizes: string;
  /** Backing dimensions when known — keeps first paint tight before decode. */
  dims?: FeedMediaDims | null;
  className?: string;
  frameClassName?: string;
  imageExtraClassName?: string;
  imageProps?: Record<string, unknown>;
  overlay?: React.ReactNode;
  /** When inside a fixed aspect-ratio cell (`absolute inset-0`), clamps to that box. */
  applyParentHeightCap?: boolean;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  /** WxH discovered from bitmap decode — scoped to {@link src} so optimistic → CDN swaps do not reuse stale sizing. */
  const [decodeState, setDecodeState] = useState<{
    src: string;
    width: number;
    height: number;
  } | null>(null);

  const intrinsic: FeedMediaDims | null =
    dims?.width && dims?.height
      ? { width: dims.width, height: dims.height }
      : decodeState?.src === src
        ? { width: decodeState.width, height: decodeState.height }
        : null;

  const [vhPx, setVhPx] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 812));
  useLayoutEffect(() => {
    const upd = () => setVhPx(window.innerHeight);
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      const nw = Math.max(1, Math.floor(cr.width));
      const nh = Math.floor(cr.height);
      setBox((prev) =>
        prev.w === nw && prev.h === nh ? prev : { w: nw, h: Math.max(0, nh) }
      );
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  const handleLoadingComplete = useCallback(
    (img: HTMLImageElement) => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w <= 0 || h <= 0) return;
      if (dims?.width && dims?.height) return;
      setDecodeState({ src, width: w, height: h });
    },
    [dims?.width, dims?.height, src]
  );

  const nw = intrinsic?.width ?? 0;
  const nh = intrinsic?.height ?? 0;
  const hasIntrinsic = nw > 0 && nh > 0;
  const orient = hasIntrinsic ? mediaOrientation(nw, nh) : ("portrait" as const);

  const viewportCap = useMemo(() => viewportMaxFeedMediaHeight(orient, vhPx), [orient, vhPx]);

  const measuredW = Math.max(1, box.w || FEED_STREAM_MAX_WIDTH_PX);
  const parentHCap =
    applyParentHeightCap && box.h > 6 ? box.h : Number.POSITIVE_INFINITY;
  const maxHeightPx = Math.min(viewportCap, parentHCap);

  const provisional = computeFeedMediaDisplaySize({
    containerWidthPx: measuredW,
    naturalWidth: 4,
    naturalHeight: 5,
    maxHeightPx,
    streamMaxWidthPx: FEED_STREAM_MAX_WIDTH_PX,
  });

  const fitted = useMemo(() => {
    if (!hasIntrinsic) return provisional;
    return computeFeedMediaDisplaySize({
      containerWidthPx: measuredW,
      naturalWidth: nw,
      naturalHeight: nh,
      maxHeightPx,
      streamMaxWidthPx: FEED_STREAM_MAX_WIDTH_PX,
    });
  }, [hasIntrinsic, maxHeightPx, measuredW, nh, nw, provisional]);

  return (
    <div ref={measureRef} className={cn("relative w-full min-w-0", frameClassName)}>
      <div className={cn("relative mx-auto flex w-full justify-center", className)}>
        <div
          className="relative overflow-hidden"
          style={{ width: Math.min(fitted.widthPx, measuredW), height: fitted.heightPx, maxWidth: "100%" }}
        >
          <FeedDecodedImageLayer
            key={src}
            src={src}
            thumbnailSrc={thumbnailSrc}
            alt={alt}
            sizes={sizes}
            imageExtraClassName={imageExtraClassName}
            imageProps={imageProps}
            onLoadingComplete={handleLoadingComplete}
          />
          {overlay}
        </div>
      </div>
    </div>
  );
}
