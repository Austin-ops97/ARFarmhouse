"use client";

import type { ReactNode } from "react";

import type { NavId } from "@/components/ar-farmhouse/dashboard-nav";
import { PropertyDataProvider } from "@/contexts/property-data-context";

const PROPERTY_DATA_ROUTES = new Set<NavId>(["calendar", "tasks", "property"]);

export function routeNeedsPropertyData(activeId: NavId): boolean {
  return PROPERTY_DATA_ROUTES.has(activeId);
}

/** Mounts Firestore property listeners only for routes that need live property data. */
export function PropertyDataScope({
  activeId,
  children,
}: {
  activeId: NavId;
  children: ReactNode;
}) {
  if (!routeNeedsPropertyData(activeId)) {
    return <>{children}</>;
  }
  return <PropertyDataProvider>{children}</PropertyDataProvider>;
}
