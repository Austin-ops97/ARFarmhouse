"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

type LocalGuideMapPreviewProps = {
  label?: string;
  className?: string;
};

export function LocalGuideMapPreview({ label = "Mena · Ouachitas", className }: LocalGuideMapPreviewProps) {
  const reduceMotion = useReducedMotion();
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-br from-zinc-900/90 via-background/80 to-primary/[0.12]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        className
      )}
    >
      <svg viewBox="0 0 320 200" className="h-full w-full opacity-95" aria-hidden>
        <defs>
          <linearGradient id="lg-hill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.35 0.04 158 / 0.35)" />
            <stop offset="100%" stopColor="oklch(0.2 0.02 250 / 0.15)" />
          </linearGradient>
          <radialGradient id="lg-glow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="oklch(0.55 0.08 158 / 0.25)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="320" height="200" fill="url(#lg-hill)" />
        <ellipse cx="160" cy="120" rx="140" ry="70" fill="url(#lg-glow)" />
        <path
          d="M0 150 Q80 120 160 135 T320 145 L320 200 L0 200 Z"
          fill="oklch(0.22 0.03 158 / 0.45)"
          stroke="oklch(0.5 0.06 158 / 0.25)"
          strokeWidth="1"
        />
        <path
          d="M40 160 Q120 130 200 150 T300 155"
          fill="none"
          stroke="oklch(0.75 0.12 158 / 0.35)"
          strokeWidth="2"
          strokeDasharray="6 8"
        />
        <motion.g
          animate={reduceMotion ? undefined : { y: [0, -3, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle cx="168" cy="118" r="14" fill="oklch(0.15 0.02 250 / 0.85)" stroke="oklch(0.55 0.08 158 / 0.8)" strokeWidth="2" />
          <path d="M168 104 L168 132 M154 118 L182 118" stroke="oklch(0.55 0.08 158 / 0.9)" strokeWidth="2" strokeLinecap="round" />
        </motion.g>
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-background/90 to-transparent px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
          <MapPin className="size-3 text-primary" aria-hidden />
          {label}
        </span>
        <span className="rounded-full border border-white/12 bg-white/[0.06] px-2 py-0.5 text-[9px] text-muted-foreground backdrop-blur-md">
          Preview only
        </span>
      </div>
    </div>
  );
}
