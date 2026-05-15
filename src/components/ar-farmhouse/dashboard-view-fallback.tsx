"use client";

/** Pulse placeholders for `next/dynamic` — avoids pulling Framer Motion into loading chunks. */

export function DashboardViewFallback() {
  return (
    <div
      className="flex min-h-[min(60vh,520px)] flex-col gap-4 px-1 py-2 sm:px-2"
      aria-busy="true"
      aria-label="Loading section"
    >
      <div className="h-9 w-44 animate-pulse rounded-xl bg-white/[0.06]" />
      <div className="min-h-[280px] flex-1 animate-pulse rounded-[1.35rem] bg-white/[0.035] ring-1 ring-white/[0.04]" />
    </div>
  );
}

export function HomeDeferredSectionFallback() {
  return (
    <div
      className="my-2 min-h-[12rem] w-full animate-pulse rounded-3xl bg-white/[0.035] ring-1 ring-white/[0.05] sm:min-h-[14rem]"
      aria-busy="true"
      aria-label="Loading section"
    />
  );
}
