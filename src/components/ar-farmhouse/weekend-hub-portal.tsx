"use client";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { WeekendHubSheet } from "@/components/ar-farmhouse/weekend-hub-sheet";

/** Renders the weekend hub overlay; keep next to `EcosystemProvider` to avoid import cycles. */
export function WeekendHubPortal() {
  const { hubOpen, hubSlug, closeWeekendHub } = useEcosystem();
  return <WeekendHubSheet open={hubOpen} slug={hubSlug ?? "current"} onClose={closeWeekendHub} />;
}
