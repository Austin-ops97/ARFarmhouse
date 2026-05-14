"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "dark" | "light";

const STORAGE_KEY = "ar-theme";

function applyDomTheme(next: ThemePreference) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", next === "dark");
  root.dataset.arTheme = next;
}

function runWithViewTransition(fn: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(fn);
    return;
  }
  const el = document.documentElement;
  el.classList.add("ar-theme-transitioning");
  fn();
  window.requestAnimationFrame(() => {
    window.setTimeout(() => el.classList.remove("ar-theme-transitioning"), 520);
  });
}

type ThemeContextValue = {
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
  /** True after hydration — avoid SSR mismatch in dependents */
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("dark");
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
      const next = stored === "light" || stored === "dark" ? stored : "dark";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- align React state with persisted DOM theme
      setThemeState(next);
      applyDomTheme(next);
    } catch {
      applyDomTheme("dark");
    }
    setReady(true);
  }, []);

  const setTheme = useCallback((t: ThemePreference) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    runWithViewTransition(() => applyDomTheme(t));
  }, []);

  const value = useMemo(() => ({ theme, setTheme, ready }), [theme, setTheme, ready]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const v = useContext(ThemeContext);
  if (!v) throw new Error("useTheme must be used within ThemeProvider");
  return v;
}
