import { afterEach, describe, expect, it, vi } from "vitest";

import { getPushConfigStatus } from "@/lib/push/config";

describe("getPushConfigStatus", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports vapid configured when key is set", () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "k");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "d");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "p");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "p.firebasestorage.app");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "1");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "app");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_VAPID_KEY", "vapid-key");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");

    const status = getPushConfigStatus();
    expect(status.firebaseConfigured).toBe(true);
    expect(status.vapidConfigured).toBe(true);
    expect(status.siteUrlConfigured).toBe(true);
  });

  it("reports vapid missing when key is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "k");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "d");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "p");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "p.firebasestorage.app");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "1");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "app");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_VAPID_KEY", "");

    const status = getPushConfigStatus();
    expect(status.vapidConfigured).toBe(false);
  });
});
