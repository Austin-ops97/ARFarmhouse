"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/contexts/auth-context";
import type { FamilyNotification } from "@/models/notification";
import {
  dismissNotification,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from "@/services/notifications";

type NotificationsContextValue = {
  notifications: FamilyNotification[];
  unreadCount: number;
  loading: boolean;
  ready: boolean;
  syncError: string | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, configured } = useAuth();
  const [notifications, setNotifications] = useState<FamilyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured || !user?.uid) {
      queueMicrotask(() => {
        setNotifications([]);
        setLoading(false);
        setReady(true);
        setSyncError(null);
      });
      return;
    }
    setLoading(true);
    setSyncError(null);
    return subscribeNotifications(
      user.uid,
      (rows) => {
        setNotifications(rows);
        setLoading(false);
        setReady(true);
        setSyncError(null);
      },
      (e) => {
        setSyncError(e.message);
        setLoading(false);
        setReady(true);
      }
    );
  }, [configured, user?.uid]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications]
  );

  const markRead = useCallback(
    async (id: string) => {
      if (!user?.uid) return;
      setNotifications((rows) =>
        rows.map((n) => (n.id === id ? { ...n, readAt: Date.now() } : n))
      );
      await markNotificationRead(user.uid, id);
    },
    [user?.uid]
  );

  const markAllRead = useCallback(async () => {
    if (!user?.uid) return;
    const unreadIds = notifications.filter((n) => !n.readAt).map((n) => n.id);
    setNotifications((rows) => rows.map((n) => ({ ...n, readAt: n.readAt ?? Date.now() })));
    await markAllNotificationsRead(user.uid, unreadIds);
  }, [notifications, user?.uid]);

  const dismiss = useCallback(
    async (id: string) => {
      if (!user?.uid) return;
      setNotifications((rows) => rows.filter((n) => n.id !== id));
      await dismissNotification(user.uid, id);
    },
    [user?.uid]
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      ready,
      syncError,
      markRead,
      markAllRead,
      dismiss,
    }),
    [notifications, unreadCount, loading, ready, syncError, markRead, markAllRead, dismiss]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
