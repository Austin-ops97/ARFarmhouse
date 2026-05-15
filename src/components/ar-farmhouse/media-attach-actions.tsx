"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function AttachActionButton({
  icon: Icon,
  label,
  disabled,
  onClick,
  ariaLabel,
  variant = "default",
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
  variant?: "default" | "compact";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-foreground transition",
        "hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "compact" && "min-h-10 px-3 py-2 text-xs"
      )}
    >
      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
      {label}
    </button>
  );
}
