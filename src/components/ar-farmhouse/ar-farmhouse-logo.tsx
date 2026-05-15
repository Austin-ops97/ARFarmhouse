"use client";

import Image from "next/image";

import { AR_FARMHOUSE_LOGO_URL } from "@/lib/brand";
import { cn } from "@/lib/utils";

type ArFarmhouseLogoProps = {
  className?: string;
  /** Outer box is square; image is letterboxed inside. */
  size?: number;
  priority?: boolean;
};

export function ArFarmhouseLogo({ className, size = 40, priority = false }: ArFarmhouseLogoProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-white shadow-[var(--ar-float-elevate)] ring-1 ring-black/[0.06] dark:border-white/12 dark:bg-white dark:ring-white/[0.08]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={AR_FARMHOUSE_LOGO_URL}
        alt="AR Farmhouse"
        fill
        sizes={`${Math.ceil(size * 1.5)}px`}
        className="object-contain p-[18%]"
        priority={priority}
      />
    </div>
  );
}
