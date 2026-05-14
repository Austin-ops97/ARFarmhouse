"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Link2 } from "lucide-react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Button } from "@/components/ui/button";
import type { FeedSurfaceInsert } from "@/lib/ecosystem-demo";
import { cn } from "@/lib/utils";

const surface = cn("ar-surface-raised relative overflow-hidden rounded-2xl");

export function FeedEcosystemCard({ insert }: { insert: FeedSurfaceInsert }) {
  const reduceMotion = useReducedMotion();
  const { openWeekendHub, goTo } = useEcosystem();

  const onCta = () => {
    if (insert.hubSlug) openWeekendHub(insert.hubSlug);
    else if (insert.navTarget) goTo(insert.navTarget);
  };

  return (
    <motion.article
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="touch-manipulation pb-6 sm:pb-8"
    >
      <div className={cn(surface, "px-4 py-4 sm:px-5 sm:py-5")}>
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-primary/90">
          <Link2 className="size-3.5" aria-hidden />
          {insert.kind === "weekend_preview" && "Ecosystem"}
          {insert.kind === "booking_pulse" && "House activity"}
          {insert.kind === "property_aware" && "Property pulse"}
        </div>
        <p className="mt-2 font-heading text-lg font-semibold tracking-tight text-foreground">{insert.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{insert.subtitle}</p>
        {insert.meta && <p className="mt-2 text-[11px] text-muted-foreground/85">{insert.meta}</p>}
        <Button type="button" variant="secondary" className="mt-4 w-full rounded-xl sm:w-auto" onClick={onCta}>
          {insert.ctaLabel}
          <ArrowRight className="size-4 opacity-80" data-icon="inline-end" />
        </Button>
      </div>
    </motion.article>
  );
}
