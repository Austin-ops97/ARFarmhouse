"use client";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { WeekendHubSheet } from "@/components/ar-farmhouse/weekend-hub-sheet";
import { useHubCalendarEvents } from "@/hooks/use-hub-calendar-events";

/** Renders the weekend hub overlay; keep next to `EcosystemProvider` to avoid import cycles. */
export function WeekendHubPortal() {
  const { hubOpen, hubSlug, closeWeekendHub } = useEcosystem();
  const hubEvents = useHubCalendarEvents(hubOpen);
  return (
    <WeekendHubSheet
      open={hubOpen}
      slug={hubSlug ?? "current"}
      calendarEvents={hubEvents}
      onClose={closeWeekendHub}
    />
  );
}
