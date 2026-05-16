"use client";

import { useCallback, useEffect, useState } from "react";

export type ActionToast = {
  message: string;
  tone: "success" | "error";
};

export function useActionToast(durationMs = 3200) {
  const [toast, setToast] = useState<ActionToast | null>(null);

  const showToast = useCallback((message: string, tone: ActionToast["tone"]) => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), durationMs);
    return () => window.clearTimeout(t);
  }, [toast, durationMs]);

  return { toast, showToast, clearToast: () => setToast(null) };
}
