"use client";

import { useEffect, useState } from "react";

import { subscribePendingBookings } from "@/services/bookings";

export function usePendingBookingCount(enabled: boolean): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    const unsub = subscribePendingBookings((rows) => setCount(rows.length));
    return unsub;
  }, [enabled]);

  return count;
}
