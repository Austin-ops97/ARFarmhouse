export type CalendarGridDayStatus = "outside" | "open" | "booked" | "busy" | "checkout";

export type CalendarGridDay = {
  day: number;
  status: CalendarGridDayStatus;
  label?: string;
  guests?: string[];
};

export type BusyWeekendSummary = {
  range: string;
  title: string;
  occupancy: string;
  tone: "booked" | "busy";
};

export type CalendarMonthMeta = {
  label: string;
  monthIndex: number;
  year: number;
  leadingBlanks: number;
  daysInMonth: number;
  /** Day of month (1–31) if `view` is the current month/year, else null */
  todayDay: number | null;
  days: CalendarGridDay[];
  busyWeekends: BusyWeekendSummary[];
};

/** Builds a real calendar grid for the month containing `view` (default: today). */
export function buildCalendarMonthMeta(view: Date = new Date()): CalendarMonthMeta {
  const year = view.getFullYear();
  const monthIndex = view.getMonth();
  const first = new Date(year, monthIndex, 1);
  const leadingBlanks = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const now = new Date();
  const todayDay =
    now.getFullYear() === year && now.getMonth() === monthIndex ? now.getDate() : null;
  const monthName = first.toLocaleString("en-US", { month: "long" });
  const days: CalendarGridDay[] = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return {
      day,
      status: "open",
      ...(todayDay === day ? { label: "Today" as const } : {}),
    };
  });
  return {
    label: `${monthName} ${year}`,
    monthIndex,
    year,
    leadingBlanks,
    daysInMonth,
    todayDay,
    days,
    busyWeekends: [],
  };
}
