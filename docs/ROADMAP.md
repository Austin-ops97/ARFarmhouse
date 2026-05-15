# Recommended future roadmap

Prioritized after Phase 7 production hardening. Not committed work — guidance for maintainers.

## Near term (high value, low risk)

1. **Cloud Functions for notifications** — move fan-out off the client; add FCM when ready.
2. **Firestore TTL / scheduled cleanup** — prune old notifications and orphaned Storage objects.
3. **Server auth** — optional middleware or session cookie if you need stronger than client-only gating.
4. **Booking approval flow** — owner confirms `pending` calendar events (rules + UI).
5. **IndexedDB offline** — `enableIndexedDbPersistence` for read-mostly views on spotty LTE.

## Medium term

6. **Push + email digests** — respect settings prefs (today localStorage); wire FCM + SendGrid/Resend for booking summaries.
7. **Activity pagination** — cursor-based feed/album/notifications when libraries grow.
8. **Audit log** — append-only `auditEvents` for bookings and property edits.
9. **Real GPS for local guide** — replace hash-based distance approximation when you want accuracy.

## Long term

10. **Multi-property** — `propertyId` on collections if the product expands beyond one farmhouse.
11. **Role matrix** — guest vs family vs owner UI guards aligned with rules.
12. **E2E tests** — Playwright for booking, upload, and notification flows on staging Firebase.
