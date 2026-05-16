"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Settings2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionToastBanner } from "@/components/ui/action-toast";
import { useAuth } from "@/contexts/auth-context";
import { useActionToast } from "@/hooks/use-action-toast";
import { DEFAULT_BOOKING_LIMITS } from "@/models/system-settings";
import type { BookingLimitsConfig } from "@/models/system-settings";
import { runMutation } from "@/lib/mutation-lifecycle";
import { subscribeSystemSettings, updateBookingLimits } from "@/services/system-settings";

const LIMIT_FIELDS: { key: keyof BookingLimitsConfig; label: string; hint: string }[] = [
  { key: "maxActiveBookingsPerUser", label: "Max active bookings", hint: "Per member at once" },
  { key: "maxPendingBookingsPerUser", label: "Max pending requests", hint: "Awaiting approval" },
  { key: "maxBookingDurationDays", label: "Max stay length (days)", hint: "Single reservation" },
  { key: "maxAdvanceBookingDays", label: "Max advance (days)", hint: "How far ahead" },
  { key: "minNoticeHours", label: "Minimum notice (hours)", hint: "0 = same-day allowed" },
];

export function AdminSettingsView() {
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const { toast, showToast } = useActionToast();
  const [limits, setLimits] = useState<BookingLimitsConfig>(DEFAULT_BOOKING_LIMITS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeSystemSettings(
      (settings) => {
        setLimits(settings.bookingLimits);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(e.message);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const save = useCallback(async () => {
    if (!user) return;
    await runMutation("settings", "save-limits", () => updateBookingLimits(limits, user.uid), {
      onStart: () => setSaving(true),
      onSuccess: () => showToast("Booking rules saved.", "success"),
      onError: (e) => showToast(e instanceof Error ? e.message : "Save failed.", "error"),
      onFinally: () => setSaving(false),
    });
  }, [limits, showToast, user]);

  return (
    <div className="mx-auto min-w-0 max-w-lg space-y-6 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground dark:border-white/10"
        >
          <Settings2 className="size-3.5 text-primary" aria-hidden />
          Admin · Settings
        </motion.div>
        <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground">Booking rules</h2>
        <p className="text-sm text-muted-foreground">
          Central limits applied to all new reservations. Changes take effect immediately.
        </p>
      </header>

      {error && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100/95">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 rounded-2xl border border-border/55 bg-card/80 p-4 dark:border-white/10 dark:bg-white/[0.04]"
        >
          {LIMIT_FIELDS.map((field) => {
            const minValue = field.key === "minNoticeHours" ? 0 : 1;
            return (
              <label key={field.key} className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">{field.label}</span>
                <span className="block text-xs text-muted-foreground">{field.hint}</span>
                <Input
                  type="number"
                  min={minValue}
                  value={limits[field.key]}
                  onChange={(e) =>
                    setLimits((prev) => ({
                      ...prev,
                      [field.key]: Math.max(
                        minValue,
                        parseInt(e.target.value, 10) || minValue
                      ),
                    }))
                  }
                  className="min-h-11 rounded-xl"
                />
              </label>
            );
          })}
          <Button
            type="button"
            className="mt-2 min-h-11 w-full rounded-xl"
            disabled={saving || !user}
            onClick={() => void save()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save rules"}
          </Button>
        </motion.div>
      )}

      <ActionToastBanner toast={toast} />
    </div>
  );
}
