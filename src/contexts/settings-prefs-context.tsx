"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const PREFS_KEY = "ar-settings-prefs-v1";

export type SettingsPrefs = {
  notifyPush: boolean;
  notifyEmailDigest: boolean;
  notifyWeekend: boolean;
  privacyLocation: boolean;
  privacyDiscoverable: boolean;
  feedChronological: boolean;
  feedRichMedia: boolean;
  guidePreferMap: boolean;
  guideQuietHours: boolean;
  behaviorHaptics: boolean;
  behaviorDataSaver: boolean;
};

export const defaultSettingsPrefs: SettingsPrefs = {
  notifyPush: true,
  notifyEmailDigest: false,
  notifyWeekend: true,
  privacyLocation: true,
  privacyDiscoverable: false,
  feedChronological: true,
  feedRichMedia: true,
  guidePreferMap: false,
  guideQuietHours: true,
  behaviorHaptics: true,
  behaviorDataSaver: false,
};

function loadPrefs(): SettingsPrefs {
  if (typeof window === "undefined") return defaultSettingsPrefs;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultSettingsPrefs;
    return { ...defaultSettingsPrefs, ...JSON.parse(raw) };
  } catch {
    return defaultSettingsPrefs;
  }
}

function savePrefs(p: SettingsPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

type SettingsPrefsContextValue = {
  prefs: SettingsPrefs;
  ready: boolean;
  patch: (partial: Partial<SettingsPrefs>) => void;
};

const SettingsPrefsContext = createContext<SettingsPrefsContextValue | null>(null);

export function SettingsPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<SettingsPrefs>(defaultSettingsPrefs);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setPrefs(loadPrefs());
      setReady(true);
    });
  }, []);

  const patch = useCallback((partial: Partial<SettingsPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      savePrefs(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ prefs, ready, patch }), [prefs, ready, patch]);

  return <SettingsPrefsContext.Provider value={value}>{children}</SettingsPrefsContext.Provider>;
}

export function useSettingsPrefs(): SettingsPrefsContextValue {
  const v = useContext(SettingsPrefsContext);
  if (!v) throw new Error("useSettingsPrefs must be used within SettingsPrefsProvider");
  return v;
}
