"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  Banknote,
  Camera,
  CheckCircle2,
  Circle,
  Compass,
  MapPinned,
  Megaphone,
  Mountain,
  PartyPopper,
  Rss,
  Shield,
  Vote,
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import {
  mockCashPool,
  mockEvents,
  mockFeed,
  mockPhotos,
  mockPoll,
  mockPropertyStatus,
  mockTasks,
  mockTrailConditions,
  mockWeekendPlans,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl",
  "transition-[transform,box-shadow,border-color] duration-300 will-change-transform"
);

function BentoMotion({
  className,
  children,
  delay = 0,
}: {
  className?: string;
  children: ReactNode;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: reduceMotion ? 0.2 : 0.55, delay: reduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function DashboardBento() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
      <BentoMotion className="xl:col-span-5" delay={0.02}>
        <div className={cn(surface, "flex h-full min-h-[260px] flex-col p-5")}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                <Rss className="size-5 text-primary" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Family feed</p>
                <p className="text-xs text-muted-foreground">Quiet updates · no noise</p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              Today
            </span>
          </div>
          <Separator className="my-4 bg-white/10" />
          <div className="space-y-4">
            {mockFeed.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{item.author}</p>
                  <p className="text-[11px] text-muted-foreground">{item.time}</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.snippet}</p>
              </div>
            ))}
          </div>
        </div>
      </BentoMotion>

      <BentoMotion className="xl:col-span-4" delay={0.05}>
        <div className={cn(surface, "flex h-full min-h-[220px] flex-col p-5")}>
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <PartyPopper className="size-5 text-mist" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Upcoming events</p>
              <p className="text-xs text-muted-foreground">Curated · not crowded</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {mockEvents.map((ev) => (
              <div
                key={ev.title}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <span
                  className={cn(
                    "mt-0.5 h-9 w-1 rounded-full",
                    ev.tone === "forest" ? "bg-primary/70" : "bg-amber-200/35"
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{ev.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{ev.when}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BentoMotion>

      <BentoMotion className="xl:col-span-3" delay={0.08}>
        <div className={cn(surface, "flex h-full min-h-[220px] flex-col p-5")}>
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <MapPinned className="size-5 text-primary" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Property map</p>
              <p className="text-xs text-muted-foreground">Preview</p>
            </div>
          </div>
          <div className="relative mt-4 min-h-[160px] flex-1 overflow-hidden rounded-2xl border border-white/10">
            <Image
              src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80"
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1280px) 320px, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full bg-background/55 px-2 py-1 backdrop-blur-md">North ridge camera</span>
              <span className="rounded-full bg-background/55 px-2 py-1 backdrop-blur-md">Live · 2m ago</span>
            </div>
          </div>
        </div>
      </BentoMotion>

      <BentoMotion className="xl:col-span-3" delay={0.1}>
        <div className={cn(surface, "flex h-full min-h-[220px] flex-col p-5")}>
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <CheckCircle2 className="size-5 text-primary" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Shared tasks</p>
              <p className="text-xs text-muted-foreground">Household rhythm</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {mockTasks.map((t) => (
              <div key={t.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                {t.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground/50" aria-hidden />
                )}
                <p className={cn("text-sm", t.done ? "text-muted-foreground line-through" : "text-foreground")}>
                  {t.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </BentoMotion>

      <BentoMotion className="xl:col-span-3" delay={0.12}>
        <div className={cn(surface, "flex h-full min-h-[220px] flex-col p-5")}>
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Banknote className="size-5 text-mist" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Shared cash pool</p>
              <p className="text-xs text-muted-foreground">{mockCashPool.note}</p>
            </div>
          </div>
          <div className="mt-6">
            <p className="font-heading text-4xl font-semibold tracking-tight text-foreground">{mockCashPool.balance}</p>
            <p className="mt-2 text-xs text-primary">{mockCashPool.change}</p>
          </div>
        </div>
      </BentoMotion>

      <BentoMotion className="xl:col-span-6" delay={0.14}>
        <div className={cn(surface, "flex h-full min-h-[200px] flex-col p-5")}>
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Camera className="size-5 text-primary" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Recent photos</p>
              <p className="text-xs text-muted-foreground">Captured on-property</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            {mockPhotos.map((src) => (
              <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10">
                <Image src={src} alt="" fill className="object-cover" sizes="(min-width: 1280px) 200px, 33vw" />
              </div>
            ))}
          </div>
        </div>
      </BentoMotion>

      <BentoMotion className="xl:col-span-4" delay={0.16}>
        <div className={cn(surface, "flex h-full min-h-[200px] flex-col p-5")}>
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Compass className="size-5 text-mist" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Weekend plans</p>
              <p className="text-xs text-muted-foreground">{mockWeekendPlans.headline}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {mockWeekendPlans.bullets.map((b) => (
              <li key={b} className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary/70" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </BentoMotion>

      <BentoMotion className="xl:col-span-4" delay={0.18}>
        <div className={cn(surface, "flex h-full min-h-[200px] flex-col p-5")}>
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Mountain className="size-5 text-primary" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Trail conditions</p>
              <p className="text-xs text-muted-foreground">{mockTrailConditions.rating}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-medium text-foreground">{mockTrailConditions.summary}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{mockTrailConditions.detail}</p>
          </div>
        </div>
      </BentoMotion>

      <BentoMotion className="xl:col-span-4" delay={0.2}>
        <div className={cn(surface, "flex h-full min-h-[200px] flex-col p-5")}>
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Shield className="size-5 text-mist" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Property status</p>
              <p className="text-xs text-muted-foreground">At-a-glance systems</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] text-muted-foreground">Perimeter</p>
              <p className="mt-2 text-sm font-medium text-foreground">{mockPropertyStatus.gates}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] text-muted-foreground">Climate</p>
              <p className="mt-2 text-sm font-medium text-foreground">{mockPropertyStatus.climate}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:col-span-1">
              <p className="text-[11px] text-muted-foreground">Power</p>
              <p className="mt-2 text-sm font-medium text-foreground">{mockPropertyStatus.generator}</p>
            </div>
          </div>
        </div>
      </BentoMotion>

      <BentoMotion className="xl:col-span-12" delay={0.22}>
        <div className={cn(surface, "flex h-full min-h-[200px] flex-col p-5")}>
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
              <Vote className="size-5 text-primary" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Family polls</p>
              <p className="text-xs text-muted-foreground">{mockPoll.votes} votes · anonymous</p>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">{mockPoll.question}</p>
          <div className="mt-4 space-y-3">
            {mockPoll.options.map((opt, idx) => {
              const pct = idx === 0 ? 58 : 42;
              return (
                <div key={opt} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{opt}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-full rounded-full bg-primary/70"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-muted-foreground">
            <Megaphone className="size-3.5 text-mist" aria-hidden />
            <span>Closes Sunday · results post to Feed automatically</span>
          </div>
        </div>
      </BentoMotion>
    </div>
  );
}
