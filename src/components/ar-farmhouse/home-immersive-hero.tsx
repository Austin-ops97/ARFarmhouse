"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, CloudSun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { mockWeather, mockWeekendGuests } from "@/lib/mock-data";
import { resolveHomeHeroNarrative, type HomeAtmosphere } from "@/lib/home-context";
import { cn } from "@/lib/utils";

function subscribeClock(cb: () => void) {
  const id = window.setInterval(cb, 60_000);
  return () => window.clearInterval(id);
}

function useMinuteTicker() {
  return useSyncExternalStore(
    subscribeClock,
    () => String(Math.floor(Date.now() / 60_000)),
    () => "0"
  );
}

const atmosphereLayers: Record<HomeAtmosphere, string> = {
  dawn: "from-amber-200/[0.12] via-transparent to-sky-200/[0.06]",
  day: "from-primary/[0.08] via-transparent to-transparent",
  dusk: "from-amber-300/[0.14] via-rose-200/[0.05] to-transparent",
  night: "from-indigo-400/[0.07] via-transparent to-primary/[0.05]",
  storm: "from-slate-400/[0.12] via-sky-900/[0.08] to-transparent",
};

export function HomeImmersiveHero() {
  const reduceMotion = useReducedMotion();
  const minute = useMinuteTicker();
  void minute;
  const narrative = resolveHomeHeroNarrative(new Date());
  const { openWeekendHub, goTo } = useEcosystem();
  const heroImage = dashboardHeroImage;

  const initials = mockWeekendGuests.map((g) =>
    g.name
      .split(" ")
      .map((p) => p[0])
      .join("")
  );

  return (
    <section
      className={cn(
        "ar-hero-shell relative isolate min-h-[min(78vh,720px)] w-full overflow-hidden rounded-[clamp(1.25rem,3vw,2rem)]",
        "shadow-[0_60px_120px_-50px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06]"
      )}
      data-atmosphere={narrative.atmosphere}
    >
      <div className="absolute inset-0">
        <Image
          src={heroImage}
          alt=""
          fill
          priority
          className="scale-[1.02] object-cover"
          sizes="(min-width: 1280px) 1200px, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.12_0.02_155)] via-[oklch(0.14_0.015_155)]/55 to-[oklch(0.16_0.012_155)]/35" />
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", atmosphereLayers[narrative.atmosphere])} />
        <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.11_0.02_155)] via-[oklch(0.11_0.02_155)]/88 to-transparent" />
        <div className="ar-grain pointer-events-none absolute inset-0 opacity-[0.22]" aria-hidden />
        {!reduceMotion && (
          <>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -left-[20%] top-[-10%] h-[85%] w-[55%] rounded-full bg-primary/[0.12] blur-[120px]"
              animate={{ opacity: [0.2, 0.38, 0.2], x: [0, 12, 0] }}
              transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -right-[15%] bottom-[-20%] h-[70%] w-[50%] rounded-full bg-mist/[0.08] blur-[100px]"
              animate={{ opacity: [0.12, 0.28, 0.12], y: [0, -10, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}
      </div>

      <div className="relative z-10 flex min-h-[min(78vh,720px)] flex-col justify-end gap-10 p-6 pb-8 sm:p-8 sm:pb-10 lg:p-12 lg:pb-12">
        <div className="max-w-3xl space-y-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/55">
            {narrative.eyebrow}
            <span className="mx-2 text-white/25">·</span>
            <span className="tracking-[0.18em] text-white/70">Alex</span>
          </p>

          <div className="space-y-4">
            <h1 className="font-heading text-[clamp(2rem,5.4vw,3.35rem)] font-semibold leading-[1.05] tracking-tight text-white text-balance">
              {narrative.headline}
            </h1>
            <p className="max-w-2xl text-[15px] leading-relaxed text-white/72 sm:text-base">{narrative.lede}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              className="rounded-full px-5 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.65)]"
              onClick={() => openWeekendHub("current")}
            >
              Open weekend hub
              <ArrowUpRight className="size-4 opacity-80" data-icon="inline-end" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="rounded-full border border-white/15 bg-white/[0.08] text-white backdrop-blur-md hover:bg-white/[0.14]"
              onClick={() => goTo("calendar")}
            >
              Calendar
            </Button>
          </div>

          <p className="text-sm text-white/55">{narrative.pulse}</p>
        </div>

        <div className="grid gap-4 border-t border-white/[0.08] pt-8 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-[1fr_1.1fr]">
          <div className="flex items-start justify-between gap-4 rounded-2xl bg-white/[0.04] px-4 py-4 ring-1 ring-white/[0.06] backdrop-blur-xl">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">{mockWeather.location}</p>
              <p className="mt-2 font-heading text-4xl font-semibold tracking-tight text-white">{mockWeather.tempF}°</p>
              <p className="mt-1 text-xs text-white/60">{mockWeather.condition}</p>
              <p className="mt-3 text-[11px] text-white/45">{mockWeather.highLow}</p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.08]">
              <CloudSun className="size-5 text-mist" aria-hidden />
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.04] px-4 py-4 ring-1 ring-white/[0.06] backdrop-blur-xl">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">Arriving soon</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex -space-x-2.5">
                {mockWeekendGuests.slice(0, 4).map((guest, i) => (
                  <Avatar key={guest.name} className="ring-2 ring-black/30" size="lg">
                    <AvatarImage src={guest.avatar} alt="" />
                    <AvatarFallback>{initials[i]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium text-white">Staggered arrivals from Friday</p>
                <p className="text-xs text-white/55">Full guest list and ETAs live in the weekend hub.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
