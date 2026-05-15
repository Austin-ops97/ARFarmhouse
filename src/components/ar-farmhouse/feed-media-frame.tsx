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

export function FeedMediaFrame({
  src,
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
  const [intrinsic, setIntrinsic] = useState<FeedMediaDims | null>(dims?.width && dims.height ? dims : null);

  useLayoutEffect(() => {
    if (dims?.width && dims.height) setIntrinsic({ width: dims.width, height: dims.height });
  }, [dims?.width, dims?.height]);

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

  const handleLoadingComplete = useCallback((img: HTMLImageElement) => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w > 0 && h > 0) setIntrinsic({ width: w, height: h });
  }, []);

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
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            draggable={false}
            className={cn(
              "select-none bg-muted/20 dark:bg-zinc-950/60",
              hasIntrinsic ? "object-cover object-center" : "object-contain object-center",
              imageExtraClassName
            )}
            onLoadingComplete={handleLoadingComplete}
            {...imageProps}
          />
          {overlay}
        </div>
      </div>
    </div>
  );
}
