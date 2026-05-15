/** Mena, Arkansas — property weather reference point. */
export const MENA_WEATHER = {
  label: "Mena, Arkansas",
  latitude: 34.5822,
  longitude: -94.2394,
  timezone: "America/Chicago",
} as const;

export type MenaWeatherSnapshot = {
  locationLabel: string;
  fetchedAt: string;
  current: {
    temperatureF: number;
    condition: string;
    weatherCode: number;
  };
  today: {
    highF: number;
    lowF: number;
    precipChance: number | null;
    condition: string;
  };
  forecast: {
    date: string;
    highF: number;
    lowF: number;
    precipChance: number | null;
    condition: string;
  }[];
};

/** WMO weather code → short label (Open-Meteo). */
export function wmoWeatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Thunderstorms";
  return "Variable";
}

export function parseOpenMeteoPayload(json: unknown): MenaWeatherSnapshot | null {
  if (!json || typeof json !== "object") return null;
  const body = json as Record<string, unknown>;
  const current = body.current as Record<string, unknown> | undefined;
  const daily = body.daily as Record<string, unknown> | undefined;
  if (!current || !daily) return null;

  const temps = daily.temperature_2m_max as number[] | undefined;
  const lows = daily.temperature_2m_min as number[] | undefined;
  const dates = daily.time as string[] | undefined;
  const codes = daily.weather_code as number[] | undefined;
  const precip = daily.precipitation_probability_max as (number | null)[] | undefined;

  if (!temps?.length || !lows?.length || !dates?.length || !codes?.length) return null;

  const currentCode = typeof current.weather_code === "number" ? current.weather_code : codes[0] ?? 0;
  const currentTemp = typeof current.temperature_2m === "number" ? current.temperature_2m : temps[0];

  const forecast = dates.slice(0, 4).map((date, i) => ({
    date,
    highF: Math.round(temps[i] ?? 0),
    lowF: Math.round(lows[i] ?? 0),
    precipChance: precip?.[i] != null ? Math.round(precip[i]!) : null,
    condition: wmoWeatherLabel(codes[i] ?? 0),
  }));

  return {
    locationLabel: MENA_WEATHER.label,
    fetchedAt: new Date().toISOString(),
    current: {
      temperatureF: Math.round(currentTemp),
      condition: wmoWeatherLabel(currentCode),
      weatherCode: currentCode,
    },
    today: {
      highF: Math.round(temps[0] ?? 0),
      lowF: Math.round(lows[0] ?? 0),
      precipChance: precip?.[0] != null ? Math.round(precip[0]!) : null,
      condition: wmoWeatherLabel(codes[0] ?? 0),
    },
    forecast: forecast.slice(1),
  };
}
