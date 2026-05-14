"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Check, CloudSun, Clock, Ship, ShoppingBasket, Tent, UtensilsCrossed } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  demoArrivals,
  demoDepartures,
  demoEquipmentCoord,
  demoGroceryList,
  demoMealPlan,
  demoPackingReminders,
  demoSharedSupplies,
  demoThisWeekend,
  demoWeekendActivities,
} from "@/lib/calendar-demo";
import { cn } from "@/lib/utils";

const surface = cn("ar-surface-raised relative overflow-hidden rounded-[1.35rem]");

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
}

export function CalendarThisWeekendHub({ onOpenCommandCenter }: { onOpenCommandCenter?: () => void }) {
  const reduceMotion = useReducedMotion();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-4 min-w-0 max-w-full overflow-x-hidden">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(surface, "overflow-hidden")}
      >
        <div className="relative h-48 sm:h-56">
          <Image src={demoThisWeekend.hero} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 900px" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-3 sm:bottom-4 sm:left-4 sm:right-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-primary/90">This weekend</p>
              <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
                {demoThisWeekend.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{demoThisWeekend.dateLabel}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end">
              {onOpenCommandCenter && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="min-h-11 w-full rounded-xl border-border/60 bg-card/85 touch-manipulation backdrop-blur-md sm:min-h-9 sm:w-auto dark:border-white/20 dark:bg-background/70"
                  onClick={onOpenCommandCenter}
                >
                  Full hub
                </Button>
              )}
              <div className="rounded-2xl border border-border/55 bg-card/80 px-3 py-2 text-right backdrop-blur-md dark:border-white/15 dark:bg-background/55">
                <p className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
                  <CloudSun className="size-3.5 text-mist" aria-hidden />
                  {demoThisWeekend.weather.label}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {demoThisWeekend.weather.highF}° / {demoThisWeekend.weather.lowF}°
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Arrivals</p>
            <ul className="mt-2 space-y-2">
              {demoArrivals.map((a) => (
                <li key={a.name} className="ar-nested-well flex items-center gap-3 rounded-2xl px-3 py-2">
                  <Avatar size="default" className="ring-2 ring-background/80">
                    <AvatarImage src={a.avatar} alt="" />
                    <AvatarFallback>{initials(a.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">{a.eta} · {a.mode}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Departures</p>
            <ul className="mt-2 space-y-2">
              {demoDepartures.map((d) => (
                <li key={d.name} className="ar-nested-well flex items-start gap-3 rounded-2xl px-3 py-2">
                  <Clock className="mt-0.5 size-4 shrink-0 text-primary/80" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.name}</p>
                    <p className="text-[11px] text-muted-foreground">{d.etd}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/90">{d.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-border/45 px-5 py-4 dark:border-white/10">
          <p className="text-xs text-muted-foreground">{demoThisWeekend.occupancySummary}</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{demoThisWeekend.notes}</p>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(surface, "p-5")}>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <UtensilsCrossed className="size-3.5 text-primary" aria-hidden />
            Meal plan
          </div>
          <ul className="mt-3 space-y-2">
            {demoMealPlan.map((m) => (
              <li key={m.meal} className="ar-nested-well rounded-2xl px-3 py-2.5">
                <p className="text-sm font-medium text-foreground">{m.meal}</p>
                <p className="text-[11px] text-muted-foreground">
                  {m.chef} · {m.dish}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className={cn(surface, "p-5")}>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Tent className="size-3.5 text-primary" aria-hidden />
            Activities
          </div>
          <ul className="mt-3 space-y-2">
            {demoWeekendActivities.map((a) => (
              <li key={a.title} className="ar-nested-well rounded-2xl px-3 py-2.5">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {a.when} · {a.people.join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(surface, "p-5")}>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ShoppingBasket className="size-3.5 text-primary" aria-hidden />
            Shared grocery
          </div>
          <ul className="mt-3 space-y-2">
            {demoGroceryList.map((g) => {
              const done = g.item in checked ? checked[g.item]! : g.done;
              return (
                <li key={g.item}>
                  <button
                    type="button"
                    onClick={() =>
                      setChecked((c) => ({
                        ...c,
                        [g.item]: !(g.item in c ? c[g.item]! : g.done),
                      }))
                    }
                    className="ar-nested-well flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:border-border/70 dark:hover:border-white/16"
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border",
                        done
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-border/55 bg-muted/50 dark:border-white/12 dark:bg-white/[0.04]"
                      )}
                    >
                      {done && <Check className="size-3.5" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>{g.item}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {g.detail}
                        {g.claimedBy ? ` · ${g.claimedBy}` : " · unclaimed"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={cn(surface, "p-5")}>
          <p className="text-xs font-medium text-muted-foreground">Supplies & house</p>
          <ul className="mt-3 space-y-2">
            {demoSharedSupplies.map((s) => (
              <li key={s.item} className="ar-nested-well rounded-2xl px-3 py-2 text-sm text-foreground/90">
                <span className="font-medium">{s.item}</span>
                <span className="text-muted-foreground"> — {s.status}</span>
              </li>
            ))}
          </ul>
          <Separator className="my-4 bg-border/50 dark:bg-white/10" />
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Ship className="size-3.5 text-primary" aria-hidden />
            Equipment
          </div>
          <ul className="mt-2 space-y-2">
            {demoEquipmentCoord.map((e) => (
              <li key={e.item} className="text-[13px] text-muted-foreground">
                <span className="font-medium text-foreground">{e.item}</span> · {e.who} — {e.note}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={cn(surface, "p-5")}>
        <p className="text-xs font-medium text-muted-foreground">Packing nudges</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {demoPackingReminders.map((p) => (
            <li
              key={p}
              className="rounded-full border border-border/50 bg-muted/45 px-3 py-1.5 text-[11px] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]"
            >
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
