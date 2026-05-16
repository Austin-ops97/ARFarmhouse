"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { useEcosystem } from "@/components/ar-farmhouse/ecosystem-context";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ar-farmhouse/user-avatar";
import { useAuth } from "@/contexts/auth-context";
import { useSettingsPrefs } from "@/contexts/settings-prefs-context";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";

function ToggleRow({
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <p className="text-[15px] font-medium text-foreground">{label}</p>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-8 w-[3.25rem] shrink-0 rounded-full border transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 disabled:opacity-45",
          checked
            ? "border-primary/40 bg-primary/90"
            : "border-border/80 bg-muted/50 dark:border-white/[0.08] dark:bg-white/[0.06]"
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-6 -translate-y-1/2 rounded-full bg-background shadow-sm ring-1 ring-border/50 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-zinc-100 dark:ring-white/10",
            checked ? "left-[calc(100%-1.65rem)]" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ar-surface-raised overflow-hidden rounded-[1.35rem]">
      <div className="border-b border-border/45 px-4 py-3 dark:border-white/[0.06]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      </div>
      <div className="divide-y divide-border/45 px-4 dark:divide-white/[0.06]">{children}</div>
    </div>
  );
}

export function SettingsView() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const { goTo } = useEcosystem();
  const { theme, setTheme, ready } = useTheme();
  const { displayName, avatarColor, user, signOut } = useAuth();
  const { prefs, patch } = useSettingsPrefs();

  return (
    <div className="pb-20 pt-1">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl"
      >
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Settings</h1>
      </motion.header>

      <div className="mt-8 flex max-w-3xl flex-col gap-4">
        <SettingsGroup title="Account">
          <div className="flex items-center gap-4 py-4">
            <UserAvatar
              name={displayName}
              colorId={avatarColor}
              uid={user?.uid}
              className="size-14 shrink-0 rounded-2xl ring-2 ring-background"
              fallbackClassName="rounded-2xl text-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-foreground">{displayName}</p>
              {user?.email ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.email}</p> : null}
            </div>
          </div>
          <div className="pb-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-between rounded-xl"
              onClick={() => goTo("profile")}
            >
              <span className="inline-flex items-center gap-2">
                <UserRound className="size-4 opacity-80" aria-hidden />
                Profile
              </span>
              <ChevronRight className="size-4 opacity-60" aria-hidden />
            </Button>
          </div>
          <div className="py-2">
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full justify-start rounded-xl text-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                void (async () => {
                  await signOut();
                  router.replace("/login");
                })();
              }}
            >
              <LogOut className="mr-2 size-4" aria-hidden />
              Sign out
            </Button>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Notifications">
          <ToggleRow label="Push notifications" checked={prefs.notifyPush} onCheckedChange={(v) => patch({ notifyPush: v })} />
          <ToggleRow
            label="Email digest"
            checked={prefs.notifyEmailDigest}
            onCheckedChange={(v) => patch({ notifyEmailDigest: v })}
          />
        </SettingsGroup>

        <SettingsGroup title="Appearance">
          <div className="grid grid-cols-2 gap-2 py-4 sm:max-w-md">
            <button
              type="button"
              disabled={!ready}
              onClick={() => setTheme("dark")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition",
                theme === "dark"
                  ? "border-primary/45 bg-primary/12 text-foreground"
                  : "border-border/60 bg-muted/25 text-muted-foreground hover:border-border dark:border-white/[0.08] dark:bg-white/[0.04]"
              )}
            >
              <Moon className="size-4" aria-hidden />
              Dark
            </button>
            <button
              type="button"
              disabled={!ready}
              onClick={() => setTheme("light")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition",
                theme === "light"
                  ? "border-primary/45 bg-primary/12 text-foreground"
                  : "border-border/60 bg-muted/25 text-muted-foreground hover:border-border dark:border-white/[0.08] dark:bg-white/[0.04]"
              )}
            >
              <Sun className="size-4" aria-hidden />
              Light
            </button>
          </div>
        </SettingsGroup>
      </div>
    </div>
  );
}
