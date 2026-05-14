"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Camera, CloudSun, Droplets, Home, Lock, Router, Users, Zap } from "lucide-react";

import type { DemoStatusCard, StatusIconKey } from "@/lib/operations-demo";
import { demoStatusCards } from "@/lib/operations-demo";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

const icons: Record<StatusIconKey, typeof CloudSun> = {
  cloud: CloudSun,
  zap: Zap,
  router: Router,
  droplets: Droplets,
  users: Users,
  home: Home,
  lock: Lock,
  camera: Camera,
};

const toneClass: Record<NonNullable<DemoStatusCard["tone"]>, string> = {
  default: "from-white/[0.06] to-transparent",
  mint: "from-primary/14 to-transparent",
  amber: "from-amber-400/12 to-transparent",
  rose: "from-rose-400/10 to-transparent",
};

export function PropertyStatusPanel() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {demoStatusCards.map((card, i) => {
        const Icon = icons[card.icon];
        const tone = card.tone ?? "default";
        return (
          <motion.div
            key={card.id}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-8%" }}
            transition={{ delay: reduceMotion ? 0 : i * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            whileHover={reduceMotion ? undefined : { y: -3 }}
            className={cn(surface, "overflow-hidden p-4 sm:p-5")}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
                toneClass[tone]
              )}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                <Icon className="size-5 text-primary" aria-hidden />
              </div>
              {card.id === "s8" && (
                <div className="relative h-14 w-24 overflow-hidden rounded-xl border border-white/10">
                  <Image
                    src="https://images.unsplash.com/photo-1470770843672-f972a00901c5?auto=format&fit=crop&w=200&q=75"
                    alt=""
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              )}
            </div>
            <p className="relative mt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{card.title}</p>
            <p className="relative mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground">{card.value}</p>
            {card.hint && <p className="relative mt-2 text-xs leading-relaxed text-muted-foreground">{card.hint}</p>}
          </motion.div>
        );
      })}
    </div>
  );
}
