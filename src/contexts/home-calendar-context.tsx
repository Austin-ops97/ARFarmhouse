"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useHomeCalendarEvents as useHomeCalendarEventsHook } from "@/hooks/use-home-calendar-events";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";

const HomeCalendarContext = createContext<PropertyCalendarEvent[]>([]);

/** Calendar listener for home dashboard (current + next month). */
export function HomeCalendarProvider({ children }: { children: ReactNode }) {
  const events = useHomeCalendarEventsHook(true);
  return <HomeCalendarContext.Provider value={events}>{children}</HomeCalendarContext.Provider>;
}

export function useHomeCalendarEvents(): PropertyCalendarEvent[] {
  return useContext(HomeCalendarContext);
}
