"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import { buildCalendarMonthMeta } from "@/lib/calendar-month-meta";
import type {
  HouseTask,
  PropertyInventoryItem,
  PropertyMapPin,
  PropertyMapTrail,
  PropertyResource,
  PropertyStatusCard,
} from "@/lib/property-operations";
import {
  subscribeCalendarEvents,
  subscribeHouseTasks,
  subscribePropertyInventory,
  subscribePropertyMapPins,
  subscribePropertyMapTrails,
  subscribePropertyResources,
  subscribePropertyStatus,
} from "@/services/property-data";

type PropertyDataContextValue = {
  tasks: HouseTask[];
  tasksLoading: boolean;
  tasksError: string | null;
  calendarEvents: PropertyCalendarEvent[];
  calendarLoading: boolean;
  calendarError: string | null;
  statusCards: PropertyStatusCard[];
  mapPins: PropertyMapPin[];
  mapTrails: PropertyMapTrail[];
  resources: PropertyResource[];
  inventory: PropertyInventoryItem[];
  configured: boolean;
};

const PropertyDataContext = createContext<PropertyDataContextValue | null>(null);

export function PropertyDataProvider({ children }: { children: ReactNode }) {
  const calendarMonth = useMemo(() => buildCalendarMonthMeta(), []);
  const [tasks, setTasks] = useState<HouseTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<PropertyCalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [statusCards, setStatusCards] = useState<PropertyStatusCard[]>([]);
  const [mapPins, setMapPins] = useState<PropertyMapPin[]>([]);
  const [mapTrails, setMapTrails] = useState<PropertyMapTrail[]>([]);
  const [resources, setResources] = useState<PropertyResource[]>([]);
  const [inventory, setInventory] = useState<PropertyInventoryItem[]>([]);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const unsubTasks = subscribeHouseTasks(
      (rows) => {
        setTasks(rows);
        setTasksLoading(false);
        setTasksError(null);
        setConfigured(true);
      },
      (e) => {
        setTasksError(e.message);
        setTasksLoading(false);
      }
    );
    const unsubCalendar = subscribeCalendarEvents(
      calendarMonth.year,
      calendarMonth.monthIndex,
      (rows) => {
        setCalendarEvents(rows);
        setCalendarLoading(false);
        setCalendarError(null);
      },
      (e) => {
        setCalendarError(e.message);
        setCalendarLoading(false);
      }
    );
    const unsubStatus = subscribePropertyStatus(setStatusCards);
    const unsubPins = subscribePropertyMapPins(setMapPins);
    const unsubTrails = subscribePropertyMapTrails(setMapTrails);
    const unsubResources = subscribePropertyResources(setResources);
    const unsubInventory = subscribePropertyInventory(setInventory);

    return () => {
      unsubTasks();
      unsubCalendar();
      unsubStatus();
      unsubPins();
      unsubTrails();
      unsubResources();
      unsubInventory();
    };
  }, [calendarMonth.year, calendarMonth.monthIndex]);

  const value = useMemo(
    () => ({
      tasks,
      tasksLoading,
      tasksError,
      calendarEvents,
      calendarLoading,
      calendarError,
      statusCards,
      mapPins,
      mapTrails,
      resources,
      inventory,
      configured,
    }),
    [
      tasks,
      tasksLoading,
      tasksError,
      calendarEvents,
      calendarLoading,
      calendarError,
      statusCards,
      mapPins,
      mapTrails,
      resources,
      inventory,
      configured,
    ]
  );

  return <PropertyDataContext.Provider value={value}>{children}</PropertyDataContext.Provider>;
}

export function usePropertyData(): PropertyDataContextValue {
  const v = useContext(PropertyDataContext);
  if (!v) throw new Error("usePropertyData must be used within PropertyDataProvider");
  return v;
}
