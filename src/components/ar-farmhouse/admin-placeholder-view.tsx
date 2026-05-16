"use client";

import { Shield } from "lucide-react";

/** Phase 1 placeholder — full admin tools ship in a later phase. */
export function AdminPlaceholderView() {
  return (
    <section className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border/60 bg-card/90 shadow-[var(--ar-float-elevate)] dark:border-white/10 dark:bg-white/[0.05]">
        <Shield className="size-7 text-primary" aria-hidden />
      </div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">Admin</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Booking approvals, blackout dates, and moderation tools will appear here in the next phase.
        Your account has admin access — the navigation is ready.
      </p>
    </section>
  );
}
