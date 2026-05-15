"use client";

import { ProfileThemeSync } from "@/components/profile-theme-sync";
import { AuthProvider } from "@/contexts/auth-context";
import { PropertyDataProvider } from "@/contexts/property-data-context";
import { SettingsPrefsProvider } from "@/contexts/settings-prefs-context";
import { ThemeProvider } from "@/contexts/theme-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SettingsPrefsProvider>
        <AuthProvider>
          <ProfileThemeSync />
          <PropertyDataProvider>{children}</PropertyDataProvider>
        </AuthProvider>
      </SettingsPrefsProvider>
    </ThemeProvider>
  );
}
