"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { homeSpotlightRotation } from "@/lib/home-context";
import { cn } from "@/lib/utils";

export function HomeContextualSpotlight() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % homeSpotlightRotation.length);
    }, 9000);
    return () => window.clearInterval(id);
  }, []);

  const item = homeSpotlightRotation[index]!;

  return (
    <section className="relative overflow-hidden rounded-3xl ring-1 ring-white/[0.06]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-mist/[0.04]" aria-hidden />
      <div className="ar-grain pointer-events-none absolute inset-0 opacity-[0.16]" aria-hidden />
      <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8">
        <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
          <Sparkles className="size-4 text-primary/80" aria-hidden />
          In focus
        </div>
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={item.id}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-primary/85">{item.label}</p>
              <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{item.title}</h3>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {homeSpotlightRotation.map((dot, i) => (
            <button
              key={dot.id}
              type="button"
              aria-label={`Show ${dot.title}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-8 bg-primary/80" : "w-2 bg-white/15 hover:bg-white/25"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
