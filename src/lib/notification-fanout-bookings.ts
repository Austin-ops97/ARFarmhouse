import { actionDebug } from "@/lib/action-debug";
import type { NotificationType } from "@/models/notification";
import { listFamilyMemberUids } from "@/lib/notification-fanout";
import { writeNotification } from "@/services/notifications";

async function fanOutBookingNotification(input: {
  type: NotificationType;
  title: string;
  body: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  bookingId: string;
  calendarEventId?: string | null;
  recipientIds: string[];
  groupKey: string;
}) {
  await Promise.allSettled(
    input.recipientIds.map((recipientId) =>
      writeNotification(recipientId, {
        type: input.type,
        title: input.title,
        body: input.body,
        actorId: input.actorId,
        actorDisplayName: input.actorName,
        actorAvatarUrl: input.actorAvatarUrl,
        entityKind: "booking",
        entityId: input.bookingId,
        routeNav: "calendar",
        routeEventId: input.calendarEventId ?? undefined,
        routeBookingId: input.bookingId,
        groupKey: input.groupKey,
      })
    )
  );
  actionDebug("notify", `booking ${input.type}`, { recipients: input.recipientIds.length });
}

export async function notifyBookingSubmitted(input: {
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  bookingId: string;
  calendarEventId?: string | null;
  title: string;
  dateLabel: string;
  status: "pending" | "pending_conflict";
}) {
  const recipients = await listFamilyMemberUids(input.actorId);
  const body =
    input.status === "pending_conflict"
      ? `${input.dateLabel} · overlaps an approved stay — needs review`
      : `${input.dateLabel} · awaiting approval`;
  await fanOutBookingNotification({
    type: "booking_submitted",
    title: `${input.actorName} submitted ${input.title}`,
    body,
    actorId: input.actorId,
    actorName: input.actorName,
    actorAvatarUrl: input.actorAvatarUrl,
    bookingId: input.bookingId,
    calendarEventId: input.calendarEventId,
    recipientIds: recipients,
    groupKey: `booking_submitted_${input.bookingId}`,
  });
}

export async function notifyBookingApproved(input: {
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  bookingId: string;
  calendarEventId?: string | null;
  creatorId: string;
  title: string;
  dateLabel: string;
}) {
  if (input.creatorId === input.actorId) return;
  await writeNotification(input.creatorId, {
    type: "booking_approved",
    title: `Your booking was approved`,
    body: `${input.title} · ${input.dateLabel}`,
    actorId: input.actorId,
    actorDisplayName: input.actorName,
    actorAvatarUrl: input.actorAvatarUrl,
    entityKind: "booking",
    entityId: input.bookingId,
    routeNav: "calendar",
    routeEventId: input.calendarEventId ?? undefined,
    routeBookingId: input.bookingId,
    groupKey: `booking_approved_${input.bookingId}`,
  });
}

export async function notifyBookingDenied(input: {
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  bookingId: string;
  calendarEventId?: string | null;
  creatorId: string;
  title: string;
  reason?: string;
}) {
  if (input.creatorId === input.actorId) return;
  await writeNotification(input.creatorId, {
    type: "booking_denied",
    title: `Booking declined`,
    body: input.reason?.trim()
      ? `${input.title} — ${input.reason.trim()}`
      : `${input.title} was not approved`,
    actorId: input.actorId,
    actorDisplayName: input.actorName,
    actorAvatarUrl: input.actorAvatarUrl,
    entityKind: "booking",
    entityId: input.bookingId,
    routeNav: "calendar",
    routeEventId: input.calendarEventId ?? undefined,
    routeBookingId: input.bookingId,
    groupKey: `booking_denied_${input.bookingId}`,
  });
}

export async function notifyBookingCancelled(input: {
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  bookingId: string;
  calendarEventId?: string | null;
  title: string;
  dateLabel: string;
  notifyUserIds: string[];
}) {
  const recipients = input.notifyUserIds.filter((id) => id && id !== input.actorId);
  await fanOutBookingNotification({
    type: "booking_cancelled",
    title: `${input.title} was cancelled`,
    body: `${input.actorName} · ${input.dateLabel}`,
    actorId: input.actorId,
    actorName: input.actorName,
    actorAvatarUrl: input.actorAvatarUrl,
    bookingId: input.bookingId,
    calendarEventId: input.calendarEventId,
    recipientIds: recipients,
    groupKey: `booking_cancelled_${input.bookingId}`,
  });
}

export async function notifyBlackoutAffectsBooking(input: {
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  bookingId: string;
  calendarEventId?: string | null;
  creatorId: string;
  title: string;
  blackoutTitle: string;
}) {
  if (!input.creatorId || input.creatorId === input.actorId) return;
  await writeNotification(input.creatorId, {
    type: "blackout_affects_booking",
    title: `Blackout may affect your booking`,
    body: `${input.blackoutTitle} overlaps ${input.title}`,
    actorId: input.actorId,
    actorDisplayName: input.actorName,
    actorAvatarUrl: input.actorAvatarUrl,
    entityKind: "booking",
    entityId: input.bookingId,
    routeNav: "calendar",
    routeEventId: input.calendarEventId ?? undefined,
    routeBookingId: input.bookingId,
    groupKey: `blackout_booking_${input.bookingId}`,
  });
}
