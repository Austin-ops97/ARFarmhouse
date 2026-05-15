"use client";

import { useEffect, useState } from "react";

import type { HouseTask } from "@/lib/property-operations";
import { subscribeHouseTasks } from "@/services/property-data";

/** Lightweight tasks listener for the home dashboard only. */
export function useHomeTasks(enabled = true) {
  const [tasks, setTasks] = useState<HouseTask[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => {
        setTasks([]);
        setLoading(false);
        setError(null);
      });
      return;
    }
    setLoading(true);
    return subscribeHouseTasks(
      (rows) => {
        setTasks(rows);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
  }, [enabled]);

  return { tasks, loading, error };
}
