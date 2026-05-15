"use client";

import { useEffect, useRef } from "react";

import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";

/** Applies Firestore profile theme when the user has no explicit local override. */
export function ProfileThemeSync() {
  const { profile, loading } = useAuth();
  const { setTheme, ready } = useTheme();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!ready || loading || appliedRef.current) return;
    const pref = profile?.themePreference;
    if (pref !== "light" && pref !== "dark") return;
    try {
      const stored = localStorage.getItem("ar-theme");
      if (stored === "light" || stored === "dark") return;
    } catch {
      /* ignore */
    }
    setTheme(pref);
    appliedRef.current = true;
  }, [loading, profile?.themePreference, ready, setTheme]);

  return null;
}
