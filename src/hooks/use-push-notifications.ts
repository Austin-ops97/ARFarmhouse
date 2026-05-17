"use client";

import { onMessage, type MessagePayload } from "firebase/messaging";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { useSettingsPrefs } from "@/contexts/settings-prefs-context";
import {
  fetchFcmDeviceToken,
  getFirebaseMessaging,
  isFirebaseMessagingSupported,
  readVapidKey,
} from "@/lib/firebase/messaging";
import { logPushConfigWarningsOnce } from "@/lib/push/config";
import { pushLog } from "@/lib/push/log";
import { pushSupportedInThisContext } from "@/lib/push/platform";
import { removePushToken, removeStaleTokensForUser, syncUserNotificationPrefs, upsertPushToken } from "@/services/push-tokens";

const PERMISSION_PROMPT_KEY = "ar-push-permission-prompted-v1";
const PERMISSION_DENIED_KEY = "ar-push-permission-denied-v1";

export type PushPermissionState = "unsupported" | "default" | "granted" | "denied";

const TOKEN_ERROR_MESSAGES: Record<string, string> = {
  vapid: "Push is not configured (missing VAPID key). Add NEXT_PUBLIC_FIREBASE_VAPID_KEY to your environment.",
  permission: "Notification permission is required.",
  service_worker: "Could not register the notification service worker.",
  unsupported: "Push notifications are not supported in this browser.",
  firebase: "Firebase is not configured for push.",
  token: "Could not register for push notifications. Try again from Settings.",
};

export function usePushNotifications() {
  const { user, configured } = useAuth();
  const { prefs } = useSettingsPrefs();
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [token, setToken] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const foregroundHandlerRef = useRef<((p: MessagePayload) => void) | null>(null);
  const registeredTokenRef = useRef<string | null>(null);
  const registerInFlightRef = useRef(false);

  useEffect(() => {
    logPushConfigWarningsOnce();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    void isFirebaseMessagingSupported().then((ok) => {
      setSupported(ok && pushSupportedInThisContext());
    });
    if ("Notification" in window) {
      setPermission(Notification.permission as PushPermissionState);
    }
  }, []);

  const registerToken = useCallback(async (): Promise<boolean> => {
    if (!user?.uid || !prefs.notifyPush) return false;
    if (!readVapidKey()) {
      setError(TOKEN_ERROR_MESSAGES.vapid);
      return false;
    }
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      setError(TOKEN_ERROR_MESSAGES.permission);
      return false;
    }
    if (registerInFlightRef.current) return false;
    registerInFlightRef.current = true;
    setRegistering(true);
    setError(null);
    try {
      const result = await fetchFcmDeviceToken();
      if (!result.ok) {
        setError(TOKEN_ERROR_MESSAGES[result.reason] ?? TOKEN_ERROR_MESSAGES.token);
        return false;
      }
      if (registeredTokenRef.current === result.token) {
        setToken(result.token);
        return true;
      }
      await upsertPushToken(user.uid, result.token);
      await removeStaleTokensForUser(user.uid, result.token);
      await syncUserNotificationPrefs(user.uid, {
        notificationsEnabled: true,
        push: true,
      });
      registeredTokenRef.current = result.token;
      setToken(result.token);
      pushLog("info", "Push token registered", { uid: user.uid });
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Push registration failed.";
      setError(msg);
      pushLog("error", "Push token registration failed", { err: msg });
      return false;
    } finally {
      registerInFlightRef.current = false;
      setRegistering(false);
    }
  }, [prefs.notifyPush, user?.uid]);

  const requestPermissionAndRegister = useCallback(async (): Promise<boolean> => {
    if (!supported || typeof window === "undefined") return false;
    if (!readVapidKey()) {
      setError(TOKEN_ERROR_MESSAGES.vapid);
      return false;
    }
    try {
      localStorage.setItem(PERMISSION_PROMPT_KEY, "1");
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);
      if (result === "denied") {
        localStorage.setItem(PERMISSION_DENIED_KEY, "1");
        setError("Notifications are blocked in your browser settings.");
        return false;
      }
      if (result !== "granted") return false;
      return registerToken();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Permission request failed.");
      return false;
    }
  }, [registerToken, supported]);

  const unregister = useCallback(async () => {
    if (!user?.uid || !token) return;
    await removePushToken(user.uid, token);
    registeredTokenRef.current = null;
    setToken(null);
    await syncUserNotificationPrefs(user.uid, {
      notificationsEnabled: false,
      push: false,
    });
  }, [token, user?.uid]);

  useEffect(() => {
    if (!configured || !user?.uid || !prefs.notifyPush || permission !== "granted") return;
    if (!readVapidKey()) return;
    if (registeredTokenRef.current) return;
    void registerToken();
  }, [configured, user?.uid, prefs.notifyPush, permission, registerToken]);

  useEffect(() => {
    if (!supported || permission !== "granted") return;
    let unsub: (() => void) | undefined;
    void getFirebaseMessaging().then((messaging) => {
      if (!messaging) return;
      unsub = onMessage(messaging, (payload) => {
        foregroundHandlerRef.current?.(payload);
      });
    });
    return () => unsub?.();
  }, [permission, supported]);

  const setForegroundHandler = useCallback((handler: ((p: MessagePayload) => void) | null) => {
    foregroundHandlerRef.current = handler;
  }, []);

  const shouldPromptPermission = useCallback(() => {
    if (!supported || !prefs.notifyPush) return false;
    if (!readVapidKey()) return false;
    if (permission !== "default") return false;
    try {
      if (localStorage.getItem(PERMISSION_DENIED_KEY)) return false;
      if (localStorage.getItem(PERMISSION_PROMPT_KEY)) return false;
    } catch {
      /* ignore */
    }
    return true;
  }, [permission, prefs.notifyPush, supported]);

  return {
    supported,
    permission,
    token,
    registering,
    error,
    registerToken,
    requestPermissionAndRegister,
    unregister,
    setForegroundHandler,
    shouldPromptPermission,
  };
}
