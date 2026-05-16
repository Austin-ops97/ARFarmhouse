"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

/**
 * Shown when Firebase Auth succeeded but Firestore profile bootstrap is incomplete.
 * Never signs the user out — offers retry instead.
 */
export function ProfileSetupBanner() {
  const { user, profile, profileSetupError, retryProfileSetup } = useAuth();
  const [retrying, setRetrying] = useState(false);

  if (!user || profile || !profileSetupError) return null;

  async function handleRetry() {
    setRetrying(true);
    try {
      await retryProfileSetup();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div
      role="alert"
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
    >
      <div className="mx-auto flex max-w-3xl gap-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-medium">Profile setup needs attention</p>
          <p className="text-muted-foreground">{profileSetupError}</p>
          <Button type="button" size="sm" variant="outline" disabled={retrying} onClick={() => void handleRetry()}>
            {retrying ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Retrying…
              </>
            ) : (
              "Retry profile setup"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

