"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { BrowserTimeoutId } from "@/lib/browser-timer";
import { buildCalendarMonthMeta } from "@/lib/calendar-month-meta";
import { calendarEventIsUserVisible } from "@/lib/booking-active";
import { mergeBookingsAndBlackoutsForMonth } from "@/lib/calendar-booking-display";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import type { BlackoutDate, Booking } from "@/models/booking";
import { subscribeBlackoutDates, subscribeBookingsForMonth } from "@/services/bookings";
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
  /** Events for the calendar month currently shown in the UI (grid, agenda for that month). */
  calendarEvents: PropertyCalendarEvent[];
  blackoutDates: BlackoutDate[];
  monthBookings: Booking[];
  /** Same month as wall-clock "today" — used for occupancy / on-property when the user browses other months. */
  calendarTodayMonthEvents: PropertyCalendarEvent[];
  /** Deduplicated union of the two (for operational panels). */
  calendarEventsForOps: PropertyCalendarEvent[];
  calendarLoading: boolean;
  calendarError: string | null;
  calendarViewDate: Date;
  setCalendarViewDate: (d: Date) => void;
  shiftCalendarMonth: (delta: number) => void;
  statusCards: PropertyStatusCard[];
  mapPins: PropertyMapPin[];
  mapTrails: PropertyMapTrail[];
  resources: PropertyResource[];
  inventory: PropertyInventoryItem[];
  propertySyncError: string | null;
  configured: boolean;
};

const PropertyDataContext = createContext<PropertyDataContextValue | null>(null);

const LISTENER_STAGGER_MS = 48;

export function PropertyDataProvider({ children }: { children: ReactNode }) {
  const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());
  const [tasks, setTasks] = useState<HouseTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [monthBookings, setMonthBookings] = useState<Booking[]>([]);
  const [blackoutDates, setBlackoutDates] = useState<BlackoutDate[]>([]);
  const [legacyCalendarEvents, setLegacyCalendarEvents] = useState<PropertyCalendarEvent[]>([]);
  const [todayMonthBookings, setTodayMonthBookings] = useState<Booking[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [statusCards, setStatusCards] = useState<PropertyStatusCard[]>([]);
  const [mapPins, setMapPins] = useState<PropertyMapPin[]>([]);
  const [mapTrails, setMapTrails] = useState<PropertyMapTrail[]>([]);
  const [resources, setResources] = useState<PropertyResource[]>([]);
  const [inventory, setInventory] = useState<PropertyInventoryItem[]>([]);
  const [propertySyncError, setPropertySyncError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);

  const viewYear = calendarViewDate.getFullYear();
  const viewMonthIndex = calendarViewDate.getMonth();

  const monthMeta = useMemo(() => buildCalendarMonthMeta(calendarViewDate), [calendarViewDate]);

  const calendarEvents = useMemo(() => {
    const unified = mergeBookingsAndBlackoutsForMonth(monthBookings, blackoutDates, monthMeta);
    const linkedIds = new Set<string>();
    for (const b of monthBookings) {
      if (b.calendarEventId) linkedIds.add(b.calendarEventId);
      linkedIds.add(b.id);
    }
    const legacyOnly = legacyCalendarEvents.filter((e) => {
      if (!calendarEventIsUserVisible(e)) return false;
      const bid = (e as PropertyCalendarEvent & { bookingId?: string }).bookingId;
      if (bid && linkedIds.has(bid)) return false;
      if (linkedIds.has(e.id)) return false;
      return true;
    });
    return [...unified, ...legacyOnly].sort((a, b) => a.startDay - b.startDay || a.title.localeCompare(b.title));
  }, [blackoutDates, legacyCalendarEvents, monthBookings, monthMeta]);

  const calendarTodayMonthEvents = useMemo(() => {
    const now = new Date();
    const ty = now.getFullYear();
    const tm = now.getMonth();
    if (ty === viewYear && tm === viewMonthIndex) return [];
    const meta = buildCalendarMonthMeta(new Date(ty, tm, 1));
    return mergeBookingsAndBlackoutsForMonth(todayMonthBookings, blackoutDates, meta);
  }, [blackoutDates, todayMonthBookings, viewMonthIndex, viewYear]);

  const calendarEventsForOps = useMemo(() => {
    const byId = new Map<string, PropertyCalendarEvent>();
    for (const e of calendarEvents) byId.set(e.id, e);
    for (const e of calendarTodayMonthEvents) byId.set(e.id, e);
    return [...byId.values()];
  }, [calendarEvents, calendarTodayMonthEvents]);

  const shiftCalendarMonth = useCallback((delta: number) => {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unsubs: (() => void)[] = [];
    const timers: BrowserTimeoutId[] = [];

    const mount = (delay: number, subscribe: () => () => void) => {
      const id = window.setTimeout(() => {
        if (cancelled) return;
        unsubs.push(subscribe());
      }, delay);
      timers.push(id);
    };

    setCalendarLoading(true);
    setPropertySyncError(null);

    const onSliceError = (label: string) => (e: Error) => {
      setPropertySyncError((prev) => prev ?? `Could not sync ${label}. ${e.message}`);
    };

    mount(0, () =>
      subscribeHouseTasks(
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
      )
    );

    mount(LISTENER_STAGGER_MS, () =>
      subscribeBookingsForMonth(
        viewYear,
        viewMonthIndex,
        (rows) => {
          setMonthBookings(rows);
          setCalendarLoading(false);
          setCalendarError(null);
        },
        (e) => {
          setCalendarError(e.message);
          setCalendarLoading(false);
        }
      )
    );

    mount(LISTENER_STAGGER_MS + 6, () =>
      subscribeBlackoutDates(
        (rows) => setBlackoutDates(rows),
        (e) => setCalendarError((prev) => prev ?? e.message)
      )
    );

    mount(LISTENER_STAGGER_MS + 12, () =>
      subscribeCalendarEvents(
        viewYear,
        viewMonthIndex,
        (rows) => setLegacyCalendarEvents(rows),
        (e) => setCalendarError((prev) => prev ?? e.message)
      )
    );

    mount(LISTENER_STAGGER_MS + 12, () => {
      const now = new Date();
      const ty = now.getFullYear();
      const tm = now.getMonth();
      if (ty === viewYear && tm === viewMonthIndex) {
        setTodayMonthBookings([]);
        return () => {};
      }
      return subscribeBookingsForMonth(
        ty,
        tm,
        (rows) => setTodayMonthBookings(rows),
        (e) => {
          setCalendarError((prev) => prev ?? e.message);
        }
      );
    });

    mount(LISTENER_STAGGER_MS * 2, () =>
      subscribePropertyStatus(setStatusCards, onSliceError("property status"))
    );
    mount(LISTENER_STAGGER_MS * 3, () =>
      subscribePropertyMapPins(setMapPins, onSliceError("map pins"))
    );
    mount(LISTENER_STAGGER_MS * 4, () =>
      subscribePropertyMapTrails(setMapTrails, onSliceError("trails"))
    );
    mount(LISTENER_STAGGER_MS * 5, () =>
      subscribePropertyResources(setResources, onSliceError("resources"))
    );
    mount(LISTENER_STAGGER_MS * 6, () =>
      subscribePropertyInventory(setInventory, onSliceError("inventory"))
    );

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      unsubs.forEach((u) => u());
    };
  }, [viewYear, viewMonthIndex]);

  const value = useMemo(
    () => ({
      tasks,
      tasksLoading,
      tasksError,
      calendarEvents,
      blackoutDates,
      monthBookings,
      calendarTodayMonthEvents,
      calendarEventsForOps,
      calendarLoading,
      calendarError,
      calendarViewDate,
      setCalendarViewDate,
      shiftCalendarMonth,
      statusCards,
      mapPins,
      mapTrails,
      resources,
      inventory,
      propertySyncError,
      configured,
    }),
    [
      calendarViewDate,
      calendarError,
      calendarEvents,
      blackoutDates,
      monthBookings,
      calendarEventsForOps,
      calendarLoading,
      calendarTodayMonthEvents,
      configured,
      inventory,
      propertySyncError,
      mapPins,
      mapTrails,
      resources,
      shiftCalendarMonth,
      statusCards,
      tasks,
      tasksError,
      tasksLoading,
    ]
  );

  return <PropertyDataContext.Provider value={value}>{children}</PropertyDataContext.Provider>;
}

export function usePropertyData(): PropertyDataContextValue {
  const v = useContext(PropertyDataContext);
  if (!v) throw new Error("usePropertyData must be used within PropertyDataProvider");
  return v;
}

export function useCalendarMonthMeta() {
  const { calendarViewDate } = usePropertyData();
  return useMemo(() => buildCalendarMonthMeta(calendarViewDate), [calendarViewDate]);
}
