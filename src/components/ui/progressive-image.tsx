"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

type ProgressiveImageProps = {
  src: string;
  alt: string;
  /** Low-res thumbnail for blur-up (optional). */
  thumbnailSrc?: string | null;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  onLoad?: () => void;
};

/**
 * Progressive image with optional thumbnail placeholder and fade-in.
 */
export function ProgressiveImage({
  src,
  alt,
  thumbnailSrc,
  fill = true,
  sizes,
  className,
  priority,
  loading = "lazy",
  onLoad,
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const showThumb = Boolean(thumbnailSrc && thumbnailSrc !== src && !loaded);

  return (
    <div className="relative size-full overflow-hidden">
      {showThumb ? (
        <Image
          src={thumbnailSrc!}
          alt=""
          aria-hidden
          fill
          sizes={sizes}
          className={cn(
            "object-cover object-center blur-md scale-105",
            loaded && "opacity-0 transition-opacity duration-300"
          )}
          unoptimized
        />
      ) : null}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        sizes={sizes}
        priority={priority}
        loading={loading}
        draggable={false}
        className={cn(
          "object-contain object-center transition-opacity duration-300 ease-out",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoadingComplete={() => {
          setLoaded(true);
          onLoad?.();
        }}
      />
    </div>
  );
}
