"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

type DashboardSectionPlaceholderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function DashboardSectionPlaceholder({ title, description, icon: Icon }: DashboardSectionPlaceholderProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(surface, "flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:gap-5")}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
        <Icon className="size-6 text-primary" aria-hidden />
      </span>
      <div className="min-w-0 space-y-1">
        <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        <p className="text-[11px] font-medium text-muted-foreground/80">Preview shell · not in this build phase</p>
      </div>
    </motion.section>
  );
}
