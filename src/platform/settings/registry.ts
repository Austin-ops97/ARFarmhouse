/**
 * Centralized settings registry — single source for keys, defaults, and sync strategy.
 */

export type SettingsScope = "local" | "firestore_user" | "firestore_system";

export type SettingDefinition<T> = {
  key: string;
  scope: SettingsScope;
  defaultValue: T;
  description: string;
  /** Feature flag keys gate experimental UI */
  featureFlag?: boolean;
};

export const SETTING_KEYS = {
  notifyPush: "notifyPush",
  notifyEmailDigest: "notifyEmailDigest",
  notifyWeekend: "notifyWeekend",
  privacyLocation: "privacyLocation",
  privacyDiscoverable: "privacyDiscoverable",
  feedChronological: "feedChronological",
  feedRichMedia: "feedRichMedia",
  feedUploadQuality: "feedUploadQuality",
  guidePreferMap: "guidePreferMap",
  guideQuietHours: "guideQuietHours",
  behaviorHaptics: "behaviorHaptics",
  behaviorDataSaver: "behaviorDataSaver",
  calendarWeekStart: "calendarWeekStart",
  uploadProgressIndicators: "uploadProgressIndicators",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export type FeedUploadQuality = "auto" | "high" | "balanced" | "data_saver";

export const LOCAL_SETTINGS_REGISTRY = {
  [SETTING_KEYS.notifyPush]: {
    key: SETTING_KEYS.notifyPush,
    scope: "local" as const,
    defaultValue: true,
    description: "Push notification preference (future)",
  },
  [SETTING_KEYS.notifyEmailDigest]: {
    key: SETTING_KEYS.notifyEmailDigest,
    scope: "local" as const,
    defaultValue: false,
    description: "Email digest preference (future)",
  },
  [SETTING_KEYS.notifyWeekend]: {
    key: SETTING_KEYS.notifyWeekend,
    scope: "local" as const,
    defaultValue: true,
    description: "Weekend reminder notifications",
  },
  [SETTING_KEYS.privacyLocation]: {
    key: SETTING_KEYS.privacyLocation,
    scope: "local" as const,
    defaultValue: true,
    description: "Share location on posts",
  },
  [SETTING_KEYS.privacyDiscoverable]: {
    key: SETTING_KEYS.privacyDiscoverable,
    scope: "local" as const,
    defaultValue: false,
    description: "Discoverable in family directory",
  },
  [SETTING_KEYS.feedChronological]: {
    key: SETTING_KEYS.feedChronological,
    scope: "local" as const,
    defaultValue: true,
    description: "Chronological feed ordering",
  },
  [SETTING_KEYS.feedRichMedia]: {
    key: SETTING_KEYS.feedRichMedia,
    scope: "local" as const,
    defaultValue: true,
    description: "Autoplay and rich media in feed",
  },
  [SETTING_KEYS.feedUploadQuality]: {
    key: SETTING_KEYS.feedUploadQuality,
    scope: "local" as const,
    defaultValue: "auto" as FeedUploadQuality,
    description: "Client upload compression profile",
  },
  [SETTING_KEYS.guidePreferMap]: {
    key: SETTING_KEYS.guidePreferMap,
    scope: "local" as const,
    defaultValue: false,
    description: "Open local guide in map mode",
  },
  [SETTING_KEYS.guideQuietHours]: {
    key: SETTING_KEYS.guideQuietHours,
    scope: "local" as const,
    defaultValue: true,
    description: "Suppress non-urgent guide prompts at night",
  },
  [SETTING_KEYS.behaviorHaptics]: {
    key: SETTING_KEYS.behaviorHaptics,
    scope: "local" as const,
    defaultValue: true,
    description: "Haptic feedback on supported devices",
  },
  [SETTING_KEYS.behaviorDataSaver]: {
    key: SETTING_KEYS.behaviorDataSaver,
    scope: "local" as const,
    defaultValue: false,
    description: "Reduce image quality and prefetch",
  },
  [SETTING_KEYS.calendarWeekStart]: {
    key: SETTING_KEYS.calendarWeekStart,
    scope: "local" as const,
    defaultValue: 0,
    description: "Week start day (0 = Sunday)",
  },
  [SETTING_KEYS.uploadProgressIndicators]: {
    key: SETTING_KEYS.uploadProgressIndicators,
    scope: "local" as const,
    defaultValue: true,
    description: "Show upload progress on posts and album",
    featureFlag: false,
  },
} satisfies Record<string, SettingDefinition<unknown>>;

export const FEATURE_FLAGS = {
  multiProperty: false,
  pushNotifications: false,
  smsNotifications: false,
  aiSummaries: false,
  weatherWidget: true,
  payments: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] === true;
}
