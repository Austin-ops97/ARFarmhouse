"use client";

import { createContext, useContext, type ReactNode } from "react";

import { usePushNotifications } from "@/hooks/use-push-notifications";

type PushNotificationsContextValue = ReturnType<typeof usePushNotifications>;

const PushNotificationsContext = createContext<PushNotificationsContextValue | null>(null);

export function PushNotificationsProvider({ children }: { children: ReactNode }) {
  const value = usePushNotifications();
  return (
    <PushNotificationsContext.Provider value={value}>{children}</PushNotificationsContext.Provider>
  );
}

export function usePushNotificationsContext(): PushNotificationsContextValue {
  const ctx = useContext(PushNotificationsContext);
  if (!ctx) {
    throw new Error("usePushNotificationsContext must be used within PushNotificationsProvider");
  }
  return ctx;
}
