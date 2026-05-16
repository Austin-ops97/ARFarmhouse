import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";

export type WeekEventSpan = {
  event: PropertyCalendarEvent;
  startCol: number;
  endCol: number;
  lane: number;
};

/** Lay out multi-day events as horizontal spans within a calendar week row. */
export function layoutSpansForWeekRow(
  row: readonly (number | null)[],
  events: readonly PropertyCalendarEvent[],
  maxLanes = 3
): WeekEventSpan[] {
  const colForDay = new Map<number, number>();
  row.forEach((day, col) => {
    if (day !== null) colForDay.set(day, col);
  });

  const candidates = events
    .filter((e) => {
      const end = e.endDay ?? e.startDay;
      return row.some((day) => day !== null && day >= e.startDay && day <= end);
    })
    .sort((a, b) => {
      const spanA = (a.endDay ?? a.startDay) - a.startDay;
      const spanB = (b.endDay ?? b.startDay) - b.startDay;
      return spanB - spanA || a.startDay - b.startDay;
    });

  const spans: WeekEventSpan[] = [];
  const laneEnds: number[] = [];

  for (const event of candidates) {
    const end = event.endDay ?? event.startDay;
    let startCol = 7;
    let endCol = -1;
    for (const [day, col] of colForDay) {
      if (day >= event.startDay && day <= end) {
        startCol = Math.min(startCol, col);
        endCol = Math.max(endCol, col);
      }
    }
    if (endCol < startCol) continue;

    let lane = laneEnds.findIndex((endColOccupied) => endColOccupied < startCol);
    if (lane === -1) {
      if (laneEnds.length >= maxLanes) continue;
      lane = laneEnds.length;
      laneEnds.push(endCol);
    } else {
      laneEnds[lane] = endCol;
    }

    spans.push({ event, startCol, endCol, lane });
  }

  return spans;
}
