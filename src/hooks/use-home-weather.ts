"use client";

import { useEffect, useState } from "react";

import type { MenaWeatherSnapshot } from "@/lib/weather-mena";

export function useHomeWeather(enabled = true) {
  const [weather, setWeather] = useState<MenaWeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/weather");
        if (!res.ok) throw new Error("Could not load weather");
        const data = (await res.json()) as MenaWeatherSnapshot;
        if (!cancelled) {
          setWeather(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Weather unavailable");
          setWeather(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { weather, loading, error };
}
