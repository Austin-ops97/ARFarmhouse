import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  notifyBookingDenied,
  notifyBookingRemoved,
} from "@/lib/notification-fanout-bookings";

const writeNotification = vi.fn().mockResolvedValue(undefined);

vi.mock("@/services/notifications", () => ({
  writeNotification: (...args: unknown[]) => writeNotification(...args),
}));

describe("booking moderation notifications", () => {
  beforeEach(() => {
    writeNotification.mockClear();
  });

  it("sends generic denial when no reason", async () => {
    await notifyBookingDenied({
      actorId: "admin",
      actorName: "Admin",
      actorAvatarUrl: null,
      bookingId: "b1",
      creatorId: "user",
      title: "Family weekend",
    });
    expect(writeNotification).toHaveBeenCalledWith(
      "user",
      expect.objectContaining({
        type: "booking_denied",
        body: "Your booking request was denied.",
      })
    );
  });

  it("includes denial reason when provided", async () => {
    await notifyBookingDenied({
      actorId: "admin",
      actorName: "Admin",
      actorAvatarUrl: null,
      bookingId: "b1",
      creatorId: "user",
      title: "Family weekend",
      reason: "Property unavailable",
    });
    expect(writeNotification).toHaveBeenCalledWith(
      "user",
      expect.objectContaining({
        body: "Your booking request was denied. Reason: Property unavailable",
      })
    );
  });

  it("sends generic removal when no delete reason", async () => {
    await notifyBookingRemoved({
      actorId: "admin",
      actorName: "Admin",
      actorAvatarUrl: null,
      bookingId: "b1",
      creatorId: "user",
      title: "Family weekend",
    });
    expect(writeNotification).toHaveBeenCalledWith(
      "user",
      expect.objectContaining({
        type: "booking_removed",
        body: "Your booking was removed by an administrator.",
      })
    );
  });

  it("includes delete reason when provided", async () => {
    await notifyBookingRemoved({
      actorId: "admin",
      actorName: "Admin",
      actorAvatarUrl: null,
      bookingId: "b1",
      creatorId: "user",
      title: "Family weekend",
      reason: "Duplicate request",
    });
    expect(writeNotification).toHaveBeenCalledWith(
      "user",
      expect.objectContaining({
        body: "Your booking was removed by an administrator. Reason: Duplicate request",
      })
    );
  });
});
