"use client";

import type { MessagePayload } from "firebase/messaging";
import { useEffect, useRef } from "react";

import { usePushNotificationsContext } from "@/contexts/push-notifications-context";
import { useNotificationNavigation } from "@/hooks/use-notification-navigation";
import { logPushConfigWarningsOnce } from "@/lib/push/config";
import type { FamilyNotification } from "@/models/notification";

const FOREGROUND_TOAST_DEDUPE_MS = 8000;

function payloadToNotification(payload: MessagePayload): FamilyNotification | null {
  const data = payload.data;
  if (!data) return null;
  const nav = (data.nav as FamilyNotification["route"]["nav"]) || "home";
  const now = Date.now();
  return {
    id: data.notificationId ?? `push_${now}`,
    type: (data.type as FamilyNotification["type"]) ?? "property_update",
    title: payload.notification?.title ?? data.title ?? "AR Farmhouse",
    body: payload.notification?.body ?? data.body ?? "",
    actorId: data.actorId ?? "",
    actorDisplayName: data.actorDisplayName ?? "AR Farmhouse",
    actorAvatarUrl: null,
    readAt: null,
    createdAt: now,
    entity: { kind: "post", id: data.postId ?? data.bookingId ?? "" },
    route: {
      nav,
      postId: data.postId,
      bookingId: data.bookingId,
      eventId: data.eventId,
    },
  };
}

/**
 * Registers foreground FCM handlers and syncs push token lifecycle with auth.
 */
export function PushNotificationBootstrap() {
  const { setForegroundHandler, permission, supported } = usePushNotificationsContext();
  const navigate = useNotificationNavigation();
  const recentToastIdsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    logPushConfigWarningsOnce();
  }, []);

  useEffect(() => {
    if (!supported || permission !== "granted") return;
    setForegroundHandler((payload) => {
      if (typeof document === "undefined" || document.visibilityState !== "visible") return;

      const mapped = payloadToNotification(payload);
      if (!mapped) return;

      const now = Date.now();
      const lastShown = recentToastIdsRef.current.get(mapped.id);
      if (lastShown && now - lastShown < FOREGROUND_TOAST_DEDUPE_MS) return;
      recentToastIdsRef.current.set(mapped.id, now);

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const n = new Notification(mapped.title, { body: mapped.body, tag: mapped.id });
        n.onclick = () => {
          window.focus();
          navigate(mapped);
          n.close();
        };
      }
    });
    return () => setForegroundHandler(null);
  }, [navigate, permission, setForegroundHandler, supported]);

  return null;
}
