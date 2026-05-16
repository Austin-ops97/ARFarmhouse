import { describe, expect, it } from "vitest";

import {
  BOOKING_ACKNOWLEDGMENT_VERSION,
  assertBookingPolicyAcknowledgment,
  createBookingPolicyAcknowledgment,
  isBookingPolicyAcknowledgmentComplete,
} from "@/lib/booking-acknowledgments";

describe("booking acknowledgments", () => {
  it("requires both acknowledgments", () => {
    const partial = {
      generalAcknowledged: true,
      firearmsAcknowledged: false,
      acknowledgmentTimestamp: new Date().toISOString(),
      acknowledgmentVersion: BOOKING_ACKNOWLEDGMENT_VERSION,
    };
    expect(isBookingPolicyAcknowledgmentComplete(partial)).toBe(false);
    expect(() => assertBookingPolicyAcknowledgment(partial)).toThrow(/all booking acknowledgments/i);
  });

  it("accepts a complete acknowledgment", () => {
    const full = createBookingPolicyAcknowledgment();
    expect(full.acknowledgmentVersion).toBe(BOOKING_ACKNOWLEDGMENT_VERSION);
    expect(isBookingPolicyAcknowledgmentComplete(full)).toBe(true);
    expect(() => assertBookingPolicyAcknowledgment(full)).not.toThrow();
  });
});
