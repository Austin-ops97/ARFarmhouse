import * as logger from "firebase-functions/logger";
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

import { getFirestore } from "firebase-admin/firestore";

import { BOOKINGS_COLLECTION } from "../constants";
import { dispatchToUser, dispatchToUsers } from "../dispatch";
import { listAdminUids } from "../tokens";

type BookingData = {
  title?: string;
  status?: string;
  createdBy?: string;
  createdByName?: string;
  deniedReason?: string | null;
  deletedReason?: string | null;
  calendarEventId?: string | null;
  deleted?: boolean;
  deletedBy?: string | null;
  approvedBy?: string | null;
};

function bookingActorName(data: BookingData, fallback = "Someone"): string {
  return (data.createdByName as string | undefined)?.trim() || fallback;
}

export const onBookingCreatedNotify = onDocumentCreated(
  { document: `${BOOKINGS_COLLECTION}/{bookingId}`, region: "us-central1" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() as BookingData;
    const status = data.status;
    if (status !== "pending" && status !== "pending_conflict") return;

    const bookingId = event.params.bookingId;
    const actorId = data.createdBy ?? "";
    const actorName = bookingActorName(data);
    const adminIds = (await listAdminUids()).filter((id) => id !== actorId);

    if (adminIds.length === 0) {
      logger.warn("No admin recipients for booking request", { bookingId });
      return;
    }

    await dispatchToUsers(adminIds, (recipientId) => ({
      recipientId,
      type: "booking_submitted",
      title: "New Booking Request",
      body: `${actorName} submitted a booking request.`,
      actorId,
      actorDisplayName: actorName,
      entityKind: "booking",
      entityId: bookingId,
      routeNav: "calendar",
      routeBookingId: bookingId,
      routeEventId: data.calendarEventId ?? null,
      groupKey: `booking_submitted_${bookingId}`,
      deepLinkParams: { bookingId },
    }));
  }
);

export const onBookingUpdatedNotify = onDocumentUpdated(
  { document: `${BOOKINGS_COLLECTION}/{bookingId}`, region: "us-central1" },
  async (event) => {
    const before = event.data?.before.data() as BookingData | undefined;
    const after = event.data?.after.data() as BookingData | undefined;
    if (!before || !after) return;

    const bookingId = event.params.bookingId;
    const creatorId = after.createdBy ?? before.createdBy ?? "";
    if (!creatorId) return;

    const calendarEventId = after.calendarEventId ?? before.calendarEventId ?? null;

    // Soft delete → notify owner only
    if (!before.deleted && after.deleted) {
      const actorId = after.deletedBy ?? "system";
      const reason = after.deletedReason?.trim();
      const body = reason
        ? `Your booking was removed. Reason: ${reason}`
        : "Your booking was removed.";
      await dispatchToUser({
        recipientId: creatorId,
        type: "booking_removed",
        title: "Booking Removed",
        body,
        actorId,
        actorDisplayName: "AR Farmhouse",
        entityKind: "booking",
        entityId: bookingId,
        routeNav: "calendar",
        routeBookingId: bookingId,
        routeEventId: calendarEventId,
        groupKey: `booking_removed_${bookingId}`,
        deepLinkParams: { bookingId },
        metadata: reason ? { reason } : null,
      });
      return;
    }

    const prevStatus = before.status;
    const nextStatus = after.status;
    if (prevStatus === nextStatus) return;

    const actorId = after.approvedBy ?? "system";

    if (nextStatus === "approved" && prevStatus !== "approved") {
      await dispatchToUser({
        recipientId: creatorId,
        type: "booking_approved",
        title: "Booking Approved",
        body: "Your booking request was approved.",
        actorId,
        actorDisplayName: "AR Farmhouse",
        entityKind: "booking",
        entityId: bookingId,
        routeNav: "calendar",
        routeBookingId: bookingId,
        routeEventId: calendarEventId,
        groupKey: `booking_approved_${bookingId}`,
        deepLinkParams: { bookingId },
      });
      return;
    }

    if (nextStatus === "denied" && prevStatus !== "denied") {
      const reason = after.deniedReason?.trim();
      const body = reason
        ? `Your booking request was denied. Reason: ${reason}`
        : "Your booking request was denied.";
      await dispatchToUser({
        recipientId: creatorId,
        type: "booking_denied",
        title: "Booking Denied",
        body,
        actorId,
        actorDisplayName: "AR Farmhouse",
        entityKind: "booking",
        entityId: bookingId,
        routeNav: "calendar",
        routeBookingId: bookingId,
        routeEventId: calendarEventId,
        groupKey: `booking_denied_${bookingId}`,
        deepLinkParams: { bookingId },
        metadata: reason ? { reason } : null,
      });
    }
  }
);

export const onBookingDeletedNotify = onDocumentDeleted(
  { document: `${BOOKINGS_COLLECTION}/{bookingId}`, region: "us-central1" },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data() as BookingData;
    const creatorId = data.createdBy ?? "";
    if (!creatorId) return;

    const bookingId = event.params.bookingId;

    // Denial flow writes `bookingDenials/{bookingId}` then deletes — skip "removed" ping.
    const denialSnap = await getFirestore().collection("bookingDenials").doc(bookingId).get();
    if (denialSnap.exists) return;
    await dispatchToUser({
      recipientId: creatorId,
      type: "booking_removed",
      title: "Booking Removed",
      body: "Your booking was removed.",
      actorId: data.deletedBy ?? "system",
      actorDisplayName: "AR Farmhouse",
      entityKind: "booking",
      entityId: bookingId,
      routeNav: "calendar",
      routeBookingId: bookingId,
      routeEventId: data.calendarEventId ?? null,
      groupKey: `booking_removed_${bookingId}`,
      deepLinkParams: { bookingId },
    });
  }
);
