"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { mockFeed } from "@/lib/mock-data";

const preview = mockFeed.slice(0, 5);

export function HomeFeedPreview() {
  const reduceMotion = useReducedMotion();
  const { goTo } = useEcosystem();

  return (
    <section className="relative">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">Family feed</p>
          <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">What just moved</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">A light pulse from the network — trip notes, arrivals, and quiet signals.</p>
        </div>
        <button
          type="button"
          onClick={() => goTo("feed")}
          className="group inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:text-primary/85"
        >
          Open feed
          <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </button>
      </div>

      <div className="mt-8 divide-y divide-white/[0.06] rounded-3xl bg-white/[0.02] px-2 ring-1 ring-white/[0.05] backdrop-blur-sm sm:px-4">
        {preview.map((item, idx) => (
          <motion.article
            key={item.id}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-8%" }}
            transition={{ delay: reduceMotion ? 0 : idx * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-2 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:py-6"
          >
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-foreground">{item.author}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.snippet}</p>
            </div>
            <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground/80 sm:pt-0.5">{item.time}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
