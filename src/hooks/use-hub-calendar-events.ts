"use client";

import { useEffect, useState } from "react";

import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import { subscribeCalendarEvents } from "@/services/property-data";

/** Lightweight month-scoped calendar listener for weekend hub (works outside PropertyDataProvider). */
export function useHubCalendarEvents(enabled: boolean, view: Date = new Date()) {
  const [events, setEvents] = useState<PropertyCalendarEvent[]>([]);

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => setEvents([]));
      return;
    }
    const y = view.getFullYear();
    const m = view.getMonth();
    return subscribeCalendarEvents(y, m, setEvents);
  }, [enabled, view.getFullYear(), view.getMonth()]);

  return events;
}
