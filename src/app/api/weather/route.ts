import { NextResponse } from "next/server";

import { MENA_WEATHER, parseOpenMeteoPayload } from "@/lib/weather-mena";

export const revalidate = 900;

export async function GET() {
  const params = new URLSearchParams({
    latitude: String(MENA_WEATHER.latitude),
    longitude: String(MENA_WEATHER.longitude),
    timezone: MENA_WEATHER.timezone,
    temperature_unit: "fahrenheit",
    current: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days: "4",
  });

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      next: { revalidate: 900 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Weather unavailable" }, { status: 502 });
    }
    const json = await res.json();
    const snapshot = parseOpenMeteoPayload(json);
    if (!snapshot) {
      return NextResponse.json({ error: "Invalid weather response" }, { status: 502 });
    }
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch {
    return NextResponse.json({ error: "Weather fetch failed" }, { status: 502 });
  }
}
