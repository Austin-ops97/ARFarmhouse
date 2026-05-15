"use client";

import { useEffect, useMemo, useState } from "react";

import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import { subscribeCalendarEvents } from "@/services/property-data";

/** Current + next month calendar events for the home operational dashboard. */
export function useHomeCalendarEvents(enabled = true, view: Date = new Date()) {
  const [currentMonth, setCurrentMonth] = useState<PropertyCalendarEvent[]>([]);
  const [nextMonth, setNextMonth] = useState<PropertyCalendarEvent[]>([]);

  const y = view.getFullYear();
  const m = view.getMonth();
  const nextY = m === 11 ? y + 1 : y;
  const nextM = m === 11 ? 0 : m + 1;

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => {
        setCurrentMonth([]);
        setNextMonth([]);
      });
      return;
    }
    const unsubA = subscribeCalendarEvents(y, m, setCurrentMonth);
    const unsubB = subscribeCalendarEvents(nextY, nextM, setNextMonth);
    return () => {
      unsubA();
      unsubB();
    };
  }, [enabled, y, m, nextY, nextM]);

  return useMemo(() => {
    const byId = new Map<string, PropertyCalendarEvent>();
    for (const e of [...currentMonth, ...nextMonth]) {
      byId.set(e.id, e);
    }
    return [...byId.values()];
  }, [currentMonth, nextMonth]);
}
