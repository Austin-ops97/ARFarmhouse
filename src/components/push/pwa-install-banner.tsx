"use client";

import { Download, Share, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { isIosSafari, isPwaInstalled, pushSupportedInThisContext } from "@/lib/push/platform";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "ar-pwa-install-dismissed-v1";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaInstallBannerProps = {
  className?: string;
};

export function PwaInstallBanner({ className }: PwaInstallBannerProps) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    setInstalled(isPwaInstalled());
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }, [deferred]);

  if (dismissed || installed) return null;

  const showIosHint = isIosSafari();
  const showAndroid = Boolean(deferred);
  const needsInstallForPush = !pushSupportedInThisContext();

  if (!showIosHint && !showAndroid && !needsInstallForPush) return null;

  const title = showIosHint ? "Add to Home Screen" : "Install AR Farmhouse";
  const body = showIosHint
    ? "Tap Share, then Add to Home Screen. Notifications on iPhone work when you open the app from your home screen icon."
    : needsInstallForPush
      ? "Install the app for reliable background notifications on this device."
      : "Install for a full-screen experience and faster access.";

  return (
    <InstallBannerPanel
      className={className}
      title={title}
      body={body}
      showIosHint={showIosHint}
      showAndroid={showAndroid}
      onDismiss={dismiss}
      onInstall={install}
    />
  );
}

function InstallBannerPanel({
  className,
  title,
  body,
  showIosHint,
  showAndroid,
  onDismiss,
  onInstall,
}: {
  className?: string;
  title: string;
  body: string;
  showIosHint: boolean;
  showAndroid: boolean;
  onDismiss: () => void;
  onInstall: () => void;
}) {
  return (
    <div
      className={cn("ar-surface-raised w-full rounded-[1.3rem] p-4 sm:p-5", className)}
      role="region"
      aria-label="Install app"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          {showIosHint ? <Share className="size-4" aria-hidden /> : <Download className="size-4" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
          {showAndroid ? (
            <Button type="button" size="sm" className="mt-3 h-9 rounded-lg" onClick={() => void onInstall()}>
              Install app
            </Button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          aria-label="Dismiss install suggestion"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
