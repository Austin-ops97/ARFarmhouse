"use client";

import { CloudRain, CloudSun, Droplets } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useHomeWeather } from "@/hooks/use-home-weather";
import { MENA_WEATHER } from "@/lib/weather-mena";
import { cn } from "@/lib/utils";

const surface =
  "h-full rounded-[1.25rem] border border-border/50 bg-card/80 p-5 shadow-[var(--ar-float-elevate)] dark:border-white/[0.08] dark:bg-white/[0.03] sm:p-6";

export function HomeWeatherCard() {
  const { weather, loading, error } = useHomeWeather();

  return (
    <section className={cn(surface)} aria-label="Weather">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
            Conditions
          </p>
          <h2 className="mt-1.5 font-heading text-lg font-semibold tracking-tight text-foreground">
            {MENA_WEATHER.label}
          </h2>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
          <CloudSun className="size-5 text-primary" aria-hidden />
        </div>
      </div>

      {loading && (
        <div className="mt-5 space-y-3">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-[200px] rounded-md" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {!loading && error && (
        <p className="mt-5 text-sm text-muted-foreground">Weather is temporarily unavailable. Check again shortly.</p>
      )}

      {!loading && weather && (
        <div className="mt-5 space-y-4">
          <div>
            <p className="font-heading text-4xl font-semibold tracking-tight text-foreground">
              {weather.current.temperatureF}°
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{weather.current.condition}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 dark:border-white/[0.06] dark:bg-white/[0.03]">
              High {weather.today.highF}° · Low {weather.today.lowF}°
            </span>
            {weather.today.precipChance != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 dark:border-white/[0.06] dark:bg-white/[0.03]">
                <Droplets className="size-3.5 text-sky-400/90" aria-hidden />
                {weather.today.precipChance}% rain
              </span>
            )}
          </div>

          {weather.forecast.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 border-t border-border/40 pt-4 dark:border-white/[0.06]">
              {weather.forecast.slice(0, 3).map((day) => {
                const label = new Date(`${day.date}T12:00:00`).toLocaleDateString("en-US", {
                  weekday: "short",
                });
                return (
                  <li
                    key={day.date}
                    className="rounded-xl border border-border/40 bg-muted/20 px-2 py-2.5 text-center dark:border-white/[0.05] dark:bg-white/[0.02]"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {day.highF}°<span className="text-muted-foreground"> / {day.lowF}°</span>
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{day.condition}</p>
                    {day.precipChance != null && day.precipChance > 0 && (
                      <p className="mt-1 inline-flex items-center justify-center gap-0.5 text-[10px] text-sky-400/90">
                        <CloudRain className="size-3" aria-hidden />
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
