"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, CloudSun, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  dashboardHeroImage,
  mockBooking,
  mockPropertyStatus,
  mockWeather,
  mockWeekendGuests,
} from "@/lib/mock-data";

function greetingForDate(d: Date) {
  const hour = d.getHours();
  if (hour < 5) return "Quiet hours";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function useGreeting() {
  return useSyncExternalStore(
    () => () => {},
    () => greetingForDate(new Date()),
    () => "Welcome home"
  );
}

export function DashboardHero() {
  const reduceMotion = useReducedMotion();
  const greeting = useGreeting();
  const { openWeekendHub } = useEcosystem();

  const initials = useMemo(
    () =>
      mockWeekendGuests.map((g) =>
        g.name
          .split(" ")
          .map((p) => p[0])
          .join("")
      ),
    []
  );

  return (
    <section className="relative min-w-0 overflow-hidden rounded-[1.35rem] border border-white/10 shadow-[0_40px_120px_-48px_rgba(0,0,0,0.85)] sm:rounded-[1.75rem]">
      <div className="absolute inset-0">
        <Image
          src={dashboardHeroImage}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="(min-width: 1280px) 1100px, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/78 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        {!reduceMotion && (
          <>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -left-1/4 top-0 h-[120%] w-[70%] rounded-full bg-primary/15 blur-3xl"
              animate={{ opacity: [0.25, 0.45, 0.25], x: [0, 18, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -right-1/4 bottom-0 h-[90%] w-[60%] rounded-full bg-mist/10 blur-3xl"
              animate={{ opacity: [0.15, 0.35, 0.15], y: [0, -12, 0] }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}
      </div>

      <div className="relative z-10 grid min-w-0 gap-6 p-5 sm:gap-8 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-10 lg:p-10">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-md">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            <span>Digital headquarters</span>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <h2 className="font-heading text-[clamp(1.5rem,5vw,2.25rem)] font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              {greeting}, Alex
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              AR Farmhouse is composed for the weekend — arrivals staggered, house climate dialed, trails
              reading clear.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-muted-foreground backdrop-blur-md">
              <ShieldCheck className="size-4 text-primary" aria-hidden />
              <span>
                {mockPropertyStatus.gates} · {mockPropertyStatus.climate}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-muted-foreground backdrop-blur-md">
              <CalendarDays className="size-4 text-mist" aria-hidden />
              <span>
                {mockBooking.title} · {mockBooking.dates}
              </span>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-xl border-white/15 bg-white/[0.08] text-foreground backdrop-blur-md hover:bg-white/[0.12]"
              onClick={() => openWeekendHub("current")}
            >
              Weekend hub
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{mockWeather.location}</p>
                <p className="mt-2 font-heading text-4xl font-semibold tracking-tight text-foreground">
                  {mockWeather.tempF}°
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{mockWeather.condition}</p>
              </div>
              <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]">
                <CloudSun className="size-5 text-mist" aria-hidden />
              </div>
            </div>
            <Separator className="my-4 bg-white/10" />
            <p className="text-xs text-muted-foreground">{mockWeather.highLow}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Users className="size-4 text-primary" aria-hidden />
                <span>Who&apos;s coming this weekend</span>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {mockBooking.guests} guests
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {mockWeekendGuests.slice(0, 4).map((guest, i) => (
                  <Avatar key={guest.name} className="ring-2 ring-background/80" size="lg">
                    <AvatarImage src={guest.avatar} alt="" />
                    <AvatarFallback>{initials[i]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-medium text-foreground">House feels full — in a good way</p>
                <p className="text-xs text-muted-foreground">Early arrivals begin Friday afternoon.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
