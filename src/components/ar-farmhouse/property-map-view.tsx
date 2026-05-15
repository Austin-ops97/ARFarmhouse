"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Layers, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

const surface =
  "relative overflow-hidden rounded-[1.35rem] border border-border/55 bg-card/85 shadow-[var(--ar-float-elevate)] dark:border-white/[0.08] dark:bg-white/[0.03]";

export function PropertyMapView() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto min-w-0 max-w-xl space-y-5 pb-10"
    >
      <header className="space-y-1 px-0.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Property orientation</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Maps</h1>
        <p className="max-w-lg text-sm text-muted-foreground">
          Trails, landmarks, and custom layers are shipping next — meanwhile the Local Guide and Calendar keep everyone aligned on the ground.
        </p>
      </header>

      <div className={cn(surface, "p-8 sm:p-10")}>
        <div className="flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <MapPin className="size-7 text-primary" aria-hidden />
          </span>
          <h2 className="mt-5 font-heading text-lg font-semibold text-foreground">Property maps in progress</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            We are consolidating aerial layers, gates, and trail GPS into one calm explorer. Until then, directions and logistics live in Guide and Tasks.
          </p>
          <div className="mt-8 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Layers className="size-4 text-primary/75" aria-hidden />
            Trails · pins · maintenance zones
          </div>
        </div>
      </div>
    </motion.div>
  );
}
