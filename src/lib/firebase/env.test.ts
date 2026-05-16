import { describe, expect, it } from "vitest";

import { migrateLegacyDefaultFirebaseStorageBucket } from "@/lib/firebase/env";

describe("migrateLegacyDefaultFirebaseStorageBucket", () => {
  it("rewrites default legacy appspot bucket to firebasestorage.app", () => {
    expect(migrateLegacyDefaultFirebaseStorageBucket("ar-farm-7e0de", "ar-farm-7e0de.appspot.com")).toBe(
      "ar-farm-7e0de.firebasestorage.app"
    );
    expect(migrateLegacyDefaultFirebaseStorageBucket("ar-farm-7e0de", "AR-FARM-7E0DE.APPSPOT.COM")).toBe(
      "ar-farm-7e0de.firebasestorage.app"
    );
  });

  it("strips gs:// prefix before comparing", () => {
    expect(migrateLegacyDefaultFirebaseStorageBucket("myproj", "gs://myproj.appspot.com")).toBe(
      "myproj.firebasestorage.app"
    );
  });

  it("does not rewrite custom bucket names", () => {
    expect(migrateLegacyDefaultFirebaseStorageBucket("myproj", "my-custom-bucket.appspot.com")).toBe(
      "my-custom-bucket.appspot.com"
    );
  });

  it("passes through canonical firebasestorage.app buckets", () => {
    expect(migrateLegacyDefaultFirebaseStorageBucket("myproj", "myproj.firebasestorage.app")).toBe(
      "myproj.firebasestorage.app"
    );
  });
});
