/**
 * Bookings domain — requests, approval, conflicts, limits.
 */

export type {
  Booking,
  BlackoutDate,
  BookingStatus,
  BookingType,
  FirestoreBooking,
} from "@/models/booking";
export {
  BOOKINGS_COLLECTION,
  BLACKOUT_DATES_COLLECTION,
} from "@/models/booking";
export {
  subscribeBookingsForMonth,
  subscribePendingBookings,
  subscribeBlackoutDates,
  mapBookingDoc,
} from "@/services/bookings";
export {
  createBooking,
  approveBooking,
  denyBooking,
  cancelBooking,
  deleteBooking,
} from "@/services/booking-mutations";
export {
  resolveBookingCreateConflict,
  type BookingConflictResult,
} from "@/lib/booking-conflict-engine";
export { DEFAULT_BOOKING_LIMITS } from "@/models/system-settings";
