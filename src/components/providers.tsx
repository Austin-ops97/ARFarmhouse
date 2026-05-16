"use client";

import { PlatformBootstrap } from "@/components/platform-bootstrap";
import { ProfileThemeSync } from "@/components/profile-theme-sync";
import { AuthProvider } from "@/contexts/auth-context";
import { SettingsPrefsProvider } from "@/contexts/settings-prefs-context";
import { ThemeProvider } from "@/contexts/theme-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SettingsPrefsProvider>
        <AuthProvider>
          <PlatformBootstrap />
          <ProfileThemeSync />
          {children}
        </AuthProvider>
      </SettingsPrefsProvider>
    </ThemeProvider>
  );
}
