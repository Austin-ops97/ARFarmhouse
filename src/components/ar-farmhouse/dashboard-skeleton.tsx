"use client";

import { motion, useReducedMotion } from "framer-motion";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div className={cn("ar-skeleton-shimmer overflow-hidden rounded-2xl bg-muted/40", className)}>
      <Skeleton className="h-full w-full rounded-2xl bg-transparent" />
    </div>
  );
}

export function DashboardSkeleton() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:flex-row">
      <aside className="hidden w-[72px] shrink-0 border-r border-border/60 bg-sidebar/80 lg:block">
        <div className="flex flex-col items-center gap-4 py-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <ShimmerBlock key={i} className="size-10 rounded-xl" />
          ))}
        </div>
      </aside>

      <main className="flex flex-1 flex-col gap-6 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
        <div className="flex items-center justify-between lg:hidden">
          <ShimmerBlock className="h-9 w-32 rounded-xl" />
          <ShimmerBlock className="size-10 rounded-full" />
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-4"
        >
          <ShimmerBlock className="h-[220px] w-full rounded-[1.75rem] sm:h-[260px]" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <ShimmerBlock
                key={i}
                className={cn(
                  "h-[132px]",
                  i % 5 === 0 && "sm:col-span-2 lg:col-span-2",
                  i === 3 && "sm:col-span-2 lg:col-span-2"
                )}
              />
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
