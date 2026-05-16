export {
  APP_LOCALE,
  calendarDayRangeToDates,
  calendarDayRangeToTimestamps,
  endOfLocalDay,
  formatBookingDateRange,
  formatLocalDate,
  formatLocalDateRange,
  formatLocalDateTime,
  now,
  nowTimestamp,
  startOfLocalDay,
  timestampFromDate,
  timestampToDate,
} from "@/lib/datetime/time";

export {
  assertFirestoreWriteSafe,
  findFirestoreWriteIssues,
  stripUndefinedDeep,
  type FirestoreWriteIssue,
} from "@/lib/datetime/firestore-write";
