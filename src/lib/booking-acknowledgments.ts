/** Bump when acknowledgment copy changes so new submissions require re-acceptance. */
export const BOOKING_POLICY_VERSION = 1;

export type BookingAcknowledgmentItem = {
  id: string;
  text: string;
};

export const BOOKING_ACKNOWLEDGMENTS: readonly BookingAcknowledgmentItem[] = [
  {
    id: "approval-not-guaranteed",
    text: "I acknowledge that all booking requests are subject to approval and are not guaranteed until officially confirmed.",
  },
  {
    id: "respect-property",
    text: "I agree to respect the property, facilities, equipment, and surrounding environment during my stay.",
  },
  {
    id: "damage-responsibility",
    text: "I understand that I am responsible for any damages caused by myself, my guests, children, pets, or visitors during the booking period.",
  },
  {
    id: "no-firearms",
    text: "I agree not to bring any firearms, weapons, or ammunition onto the property without prior written approval from the property owners.",
  },
  {
    id: "pet-approval",
    text: "I understand that any pets brought onto the property must receive prior approval before arrival.",
  },
  {
    id: "owner-discretion",
    text: "I acknowledge that property owners reserve the right to deny or cancel booking requests at their discretion.",
  },
  {
    id: "rules-enforcement",
    text: "I understand that failure to follow property rules or policies may result in removal from the property and restriction of future bookings.",
  },
  {
    id: "guest-compliance",
    text: "I acknowledge that I am responsible for ensuring all invited guests and visitors comply with all property rules and policies.",
  },
  {
    id: "no-access-until-approved",
    text: "I understand that submitting this request does not guarantee access until approval has been granted.",
  },
] as const;

export type BookingPolicyAcknowledgment = {
  policyVersion: number;
  /** ISO-8601 timestamp from the client at confirm time. */
  acceptedAt: string;
  acknowledgedIds: string[];
};

export function createBookingPolicyAcknowledgment(
  acknowledgedIds: string[],
  acceptedAt: Date = new Date()
): BookingPolicyAcknowledgment {
  return {
    policyVersion: BOOKING_POLICY_VERSION,
    acceptedAt: acceptedAt.toISOString(),
    acknowledgedIds: [...acknowledgedIds],
  };
}

export function isBookingPolicyAcknowledgmentComplete(
  acknowledgment: BookingPolicyAcknowledgment | undefined | null
): boolean {
  if (!acknowledgment) return false;
  if (acknowledgment.policyVersion !== BOOKING_POLICY_VERSION) return false;
  const accepted = new Set(acknowledgment.acknowledgedIds);
  return BOOKING_ACKNOWLEDGMENTS.every((item) => accepted.has(item.id));
}

export function assertBookingPolicyAcknowledgment(
  acknowledgment: BookingPolicyAcknowledgment | undefined
): void {
  if (!isBookingPolicyAcknowledgmentComplete(acknowledgment)) {
    throw new Error("Complete all booking acknowledgments before submitting.");
  }
}
