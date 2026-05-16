"use client";

import { CloudRain, CloudSun, Droplets } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useHomeWeather } from "@/hooks/use-home-weather";
import { MENA_WEATHER } from "@/lib/weather-mena";
import { cn } from "@/lib/utils";

const surface =
  "h-full rounded-[1.125rem] border border-border/42 bg-card/74 p-4 shadow-[var(--ar-float-subtle)] backdrop-blur-[1px] dark:border-white/[0.065] dark:bg-white/[0.032] dark:shadow-[var(--ar-float-subtle)] sm:rounded-xl sm:p-[1.05rem] md:p-[1.05rem]";

export function HomeWeatherCard() {
  const { weather, loading, error } = useHomeWeather();

  return (
    <section className={cn(surface)} aria-label="Weather">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/78 sm:text-[11px] sm:tracking-[0.21em]">
            Conditions
          </p>
          <h2 className="mt-1 font-heading text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {MENA_WEATHER.label}
          </h2>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/18 sm:size-10 sm:rounded-xl">
          <CloudSun className="size-[1.125rem] text-primary sm:size-5" aria-hidden />
        </div>
      </div>

      {loading && (
        <div className="mt-4 space-y-2.5">
          <Skeleton className="h-9 w-[5.25rem] rounded-lg" />
          <Skeleton className="h-3 w-full max-w-[180px] rounded-md" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      )}

      {!loading && error && (
        <p className="mt-4 text-[13px] leading-snug text-muted-foreground">
          Weather is temporarily unavailable. Check again shortly.
        </p>
      )}

      {!loading && weather && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="font-heading text-[2rem] font-semibold tabular-nums leading-none tracking-tight text-foreground sm:text-4xl">
              {weather.current.temperatureF}°
            </p>
            <p className="pb-0.5 text-[13px] font-medium leading-tight text-foreground sm:text-sm">{weather.current.condition}</p>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-border/45 bg-muted/25 px-2 py-0.5 dark:border-white/[0.05] dark:bg-white/[0.03]">
              High {weather.today.highF}° · Low {weather.today.lowF}°
            </span>
            {weather.today.precipChance != null && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/45 bg-muted/25 px-2 py-0.5 dark:border-white/[0.05] dark:bg-white/[0.03]">
                <Droplets className="size-3 text-sky-400/90" aria-hidden />
                {weather.today.precipChance}% rain
              </span>
            )}
          </div>

          {weather.forecast.length > 0 && (
            <ul className="grid grid-cols-3 gap-1.5 border-t border-border/35 pt-3 dark:border-white/[0.045]">
              {weather.forecast.slice(0, 3).map((day) => {
                const label = new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", {
                  weekday: "short",
                });
                return (
                  <li
                    key={day.date}
                    className="rounded-lg border border-border/38 bg-muted/18 px-1.5 py-2 text-center dark:border-white/[0.045] dark:bg-white/[0.02]"
                  >
                    <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-[13px] font-semibold tabular-nums leading-tight text-foreground">
                      {day.highF}°<span className="font-medium text-muted-foreground">/{day.lowF}°</span>
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[9px] leading-tight text-muted-foreground">{day.condition}</p>
                    {day.precipChance != null && day.precipChance > 0 && (
                      <p className="mt-1 inline-flex items-center justify-center gap-0.5 text-[9px] text-sky-400/90">
                        <CloudRain className="size-2.5" aria-hidden />
                        {day.precipChance}%
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
