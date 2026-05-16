import { describe, expect, it } from "vitest";

import {
  BOOKING_ACKNOWLEDGMENTS,
  BOOKING_POLICY_VERSION,
  assertBookingPolicyAcknowledgment,
  createBookingPolicyAcknowledgment,
  isBookingPolicyAcknowledgmentComplete,
} from "@/lib/booking-acknowledgments";

describe("booking acknowledgments", () => {
  it("requires every policy item", () => {
    const partial = createBookingPolicyAcknowledgment([BOOKING_ACKNOWLEDGMENTS[0].id]);
    expect(isBookingPolicyAcknowledgmentComplete(partial)).toBe(false);
    expect(() => assertBookingPolicyAcknowledgment(partial)).toThrow(/all booking acknowledgments/i);
  });

  it("accepts a full acknowledgment set", () => {
    const full = createBookingPolicyAcknowledgment(BOOKING_ACKNOWLEDGMENTS.map((item) => item.id));
    expect(full.policyVersion).toBe(BOOKING_POLICY_VERSION);
    expect(isBookingPolicyAcknowledgmentComplete(full)).toBe(true);
    expect(() => assertBookingPolicyAcknowledgment(full)).not.toThrow();
  });
});
