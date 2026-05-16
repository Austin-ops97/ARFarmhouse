/** Bump when acknowledgment copy changes so new submissions require re-acceptance. */
export const BOOKING_ACKNOWLEDGMENT_VERSION = 2;

export const BOOKING_GENERAL_ACKNOWLEDGMENT_TEXT =
  "I acknowledge and agree to follow all property rules, booking policies, cleanup expectations, guest responsibilities, safety requirements, pet approval requirements, and operational guidelines while using the property. I understand that booking requests are subject to approval and may be denied, revoked, or modified at the discretion of the property owners.";

export const BOOKING_FIREARMS_ACKNOWLEDGMENT_TEXT =
  "I agree not to bring any firearms, weapons, or ammunition onto the property without prior written approval from the property owners.";

export type BookingPolicyAcknowledgment = {
  generalAcknowledged: boolean;
  firearmsAcknowledged: boolean;
  /** ISO-8601 timestamp from the client at confirm time. */
  acknowledgmentTimestamp: string;
  acknowledgmentVersion: number;
};

export function createBookingPolicyAcknowledgment(
  acceptedAt: Date = new Date()
): BookingPolicyAcknowledgment {
  return {
    generalAcknowledged: true,
    firearmsAcknowledged: true,
    acknowledgmentTimestamp: acceptedAt.toISOString(),
    acknowledgmentVersion: BOOKING_ACKNOWLEDGMENT_VERSION,
  };
}

export function isBookingPolicyAcknowledgmentComplete(
  acknowledgment: BookingPolicyAcknowledgment | undefined | null
): boolean {
  if (!acknowledgment) return false;
  if (acknowledgment.acknowledgmentVersion !== BOOKING_ACKNOWLEDGMENT_VERSION) {
    return false;
  }
  if (
    acknowledgment.generalAcknowledged !== true ||
    acknowledgment.firearmsAcknowledged !== true
  ) {
    return false;
  }
  return Boolean(acknowledgment.acknowledgmentTimestamp);
}

export function assertBookingPolicyAcknowledgment(
  acknowledgment: BookingPolicyAcknowledgment | undefined
): void {
  if (!isBookingPolicyAcknowledgmentComplete(acknowledgment)) {
    throw new Error("Complete all booking acknowledgments before submitting.");
  }
}
