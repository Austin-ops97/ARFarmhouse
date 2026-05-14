"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { DashboardBento } from "@/components/ar-farmhouse/dashboard-bento";
import { DashboardHero } from "@/components/ar-farmhouse/dashboard-hero";
import { DashboardMobileNav } from "@/components/ar-farmhouse/dashboard-mobile-nav";
import { DashboardSidebar } from "@/components/ar-farmhouse/dashboard-sidebar";
import type { NavId } from "@/components/ar-farmhouse/dashboard-nav";

export function Dashboard() {
  const [activeId, setActiveId] = useState<NavId>("home");

  return (
    <div className="min-h-dvh bg-background">
      <DashboardSidebar activeId={activeId} onSelect={setActiveId} />

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border/60 bg-background/75 px-4 py-3.5 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/55 lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-inner shadow-white/5">
              <Sparkles className="size-5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-base font-semibold tracking-tight text-foreground">AR Farmhouse</p>
              <p className="truncate text-xs text-muted-foreground">Aspen Ridge · this weekend</p>
            </div>
          </div>
          <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-medium text-muted-foreground">
            Demo
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] space-y-6 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
          <DashboardHero />
          <DashboardBento />
        </main>
      </div>

      <DashboardMobileNav activeId={activeId} onSelect={setActiveId} />
    </div>
  );
}
