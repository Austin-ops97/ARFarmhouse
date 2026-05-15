"use client";

import { useEffect, useState } from "react";

import type { PropertyInventoryItem, PropertyStatusCard } from "@/lib/property-operations";
import { subscribePropertyInventory, subscribePropertyStatus } from "@/services/property-data";

/** Scoped status + inventory for weekend hub (outside PropertyDataProvider). */
export function useHubPropertyOps(enabled: boolean) {
  const [statusCards, setStatusCards] = useState<PropertyStatusCard[]>([]);
  const [inventory, setInventory] = useState<PropertyInventoryItem[]>([]);

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => {
        setStatusCards([]);
        setInventory([]);
      });
      return;
    }
    const unsubs = [subscribePropertyStatus(setStatusCards), subscribePropertyInventory(setInventory)];
    return () => unsubs.forEach((u) => u());
  }, [enabled]);

  return { statusCards, inventory };
}
