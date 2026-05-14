"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Camera, CloudSun, Heart, Home, Sparkles, Users } from "lucide-react";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { demoFamilyMembers } from "@/lib/social-demo";
import { mockBooking, mockPhotos, mockPropertyStatus, mockWeather } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const railCard = cn(
  "rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-xl",
  "shadow-[0_12px_40px_-28px_rgba(0,0,0,0.65)]"
);

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

export function FeedRail() {
  const reduceMotion = useReducedMotion();
  const { openWeekendHub } = useEcosystem();

  return (
    <div
      className="sticky top-[calc(var(--ar-header-height)+0.75rem)] space-y-4"
      role="complementary"
      aria-label="At the property"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={railCard}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium text-primary/90">
          <Heart className="size-3.5" aria-hidden />
          <span>Shared memory</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Same weekend last year: firelight on the dock, slow songs, kids asleep in camping chairs.
        </p>
        <button
          type="button"
          onClick={() => openWeekendHub("current")}
          className="mt-3 text-[11px] font-medium text-primary hover:underline"
        >
          Open this weekend&apos;s hub
        </button>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={railCard}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <CalendarDays className="size-3.5 text-primary" aria-hidden />
          <span>Upcoming weekend</span>
        </div>
        <p className="mt-2 font-heading text-lg font-semibold tracking-tight text-foreground">{mockBooking.title}</p>
        <p className="text-xs text-muted-foreground">{mockBooking.dates}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/90">Soft arrivals · house already breathing for guests.</p>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={railCard}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-muted-foreground">{mockWeather.location}</span>
          <CloudSun className="size-4 text-mist" aria-hidden />
        </div>
        <p className="mt-1 font-heading text-3xl font-semibold tracking-tight text-foreground">{mockWeather.tempF}°</p>
        <p className="text-xs text-muted-foreground">{mockWeather.condition}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">{mockWeather.highLow}</p>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={railCard}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <Users className="size-3.5 text-primary" aria-hidden />
          <span>Here now</span>
        </div>
        <div className="mt-3 flex -space-x-2">
          {demoFamilyMembers.slice(0, 5).map((m) => (
            <Avatar key={m.id} className="ring-2 ring-background" size="default">
              <AvatarImage src={m.avatar} alt="" />
              <AvatarFallback>{initials(m.name)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Weekend guests drifting in — quiet energy at the farmhouse.</p>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={railCard}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <Home className="size-3.5 text-primary" aria-hidden />
          <span>Property pulse</span>
        </div>
        <ul className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
          <li className="flex justify-between gap-2">
            <span>Gates</span>
            <span className="text-foreground/90">{mockPropertyStatus.gates}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Interior</span>
            <span className="text-foreground/90">{mockPropertyStatus.climate}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Power</span>
            <span className="text-foreground/90">{mockPropertyStatus.generator}</span>
          </li>
        </ul>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={railCard}
      >
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <Camera className="size-3.5 text-primary" aria-hidden />
          <span>Trending frames</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {mockPhotos.slice(0, 3).map((src, i) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-xl border border-white/10">
              <Image src={src} alt="" fill className="object-cover" sizes="96px" />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-background/60 px-1 py-0.5 text-[9px] text-muted-foreground backdrop-blur-sm">
                  Home
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Sparkles className="size-3 text-primary/80" aria-hidden />
          From this week&apos;s feed
        </p>
      </motion.div>
    </div>
  );
}
