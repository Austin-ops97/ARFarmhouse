"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, className, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("px-4 py-14 text-center", className)}
    >
      <motion.div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border/55 bg-muted/40 dark:border-white/10 dark:bg-white/[0.04]">
        <Icon className="size-5 text-primary" aria-hidden />
      </motion.div>
      <p className="mt-5 font-heading text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action ? <motion.div className="mt-5">{action}</motion.div> : null}
    </motion.div>
  );
}
