/**
 * Settings domain — user prefs, system config, feature flags.
 */

export {
  SettingsPrefsProvider,
  useSettingsPrefs,
  defaultSettingsPrefs,
  type SettingsPrefs,
} from "@/contexts/settings-prefs-context";
export {
  SETTING_KEYS,
  LOCAL_SETTINGS_REGISTRY,
  FEATURE_FLAGS,
  isFeatureEnabled,
  type FeatureFlag,
  type FeedUploadQuality,
} from "@/platform/settings/registry";
export {
  subscribeSystemSettings,
  updateBookingLimits,
} from "@/services/system-settings";
export type { SystemSettings, BookingLimitsConfig } from "@/models/system-settings";
