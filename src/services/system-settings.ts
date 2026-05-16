import { doc, getDoc, onSnapshot, setDoc, serverTimestamp, type DocumentData } from "firebase/firestore";

import { actionDebug } from "@/lib/action-debug";
import { tryGetFirestoreDb } from "@/lib/firebase";
import { timestampToDate } from "@/lib/booking-dates";
import { mergeBookingLimits } from "@/lib/booking-limits";
import {
  DEFAULT_BOOKING_LIMITS,
  SYSTEM_SETTINGS_COLLECTION,
  SYSTEM_SETTINGS_DOC_ID,
  type BookingLimitsConfig,
  type FirestoreSystemSettings,
  type SystemSettings,
} from "@/models/system-settings";

function mapSettingsDoc(data: Partial<FirestoreSystemSettings>): SystemSettings {
  return {
    bookingLimits: mergeBookingLimits(data.bookingLimits),
    updatedAt: timestampToDate(data.updatedAt),
    updatedBy: (data.updatedBy as string) ?? "",
  };
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  const db = tryGetFirestoreDb();
  if (!db) {
    return { bookingLimits: DEFAULT_BOOKING_LIMITS, updatedAt: null, updatedBy: "" };
  }
  const snap = await getDoc(doc(db, SYSTEM_SETTINGS_COLLECTION, SYSTEM_SETTINGS_DOC_ID));
  if (!snap.exists()) {
    return { bookingLimits: DEFAULT_BOOKING_LIMITS, updatedAt: null, updatedBy: "" };
  }
  return mapSettingsDoc(snap.data() as Partial<FirestoreSystemSettings>);
}

export function subscribeSystemSettings(
  onSettings: (settings: SystemSettings) => void,
  onError?: (e: Error) => void
): () => void {
  const db = tryGetFirestoreDb();
  if (!db) {
    onSettings({ bookingLimits: DEFAULT_BOOKING_LIMITS, updatedAt: null, updatedBy: "" });
    return () => {};
  }
  const ref = doc(db, SYSTEM_SETTINGS_COLLECTION, SYSTEM_SETTINGS_DOC_ID);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onSettings({ bookingLimits: DEFAULT_BOOKING_LIMITS, updatedAt: null, updatedBy: "" });
        return;
      }
      onSettings(mapSettingsDoc(snap.data() as Partial<FirestoreSystemSettings>));
    },
    (err) => {
      actionDebug("settings", "subscribe error", err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

export async function updateBookingLimits(
  limits: BookingLimitsConfig,
  adminUid: string
): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable");
  const ref = doc(db, SYSTEM_SETTINGS_COLLECTION, SYSTEM_SETTINGS_DOC_ID);
  await setDoc(
    ref,
    {
      bookingLimits: mergeBookingLimits(limits),
      updatedAt: serverTimestamp(),
      updatedBy: adminUid,
    } as DocumentData,
    { merge: true }
  );
}
