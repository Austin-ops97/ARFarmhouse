"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useHubCalendarEvents } from "@/hooks/use-hub-calendar-events";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";

const HomeCalendarContext = createContext<PropertyCalendarEvent[]>([]);

/** Single month-scoped calendar listener for home surfaces (avoids duplicate subscriptions). */
export function HomeCalendarProvider({ children }: { children: ReactNode }) {
  const events = useHubCalendarEvents(true);
  return <HomeCalendarContext.Provider value={events}>{children}</HomeCalendarContext.Provider>;
}

export function useHomeCalendarEvents(): PropertyCalendarEvent[] {
  return useContext(HomeCalendarContext);
}
