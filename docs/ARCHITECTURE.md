# AR Farmhouse — Architecture overview

Private family property ecosystem: feed, calendar/bookings, album, property hub, map, tasks, notifications.

## Stack

- **Next.js 16** (App Router, client-heavy dashboard)
- **Firebase** Auth, Firestore, Storage
- **Vercel** static/SSR hosting for the web shell

## Data model (Firestore)

| Collection | Purpose |
|------------|---------|
| `users/{uid}` | Profile, `role` (`owner` for property edits) |
| `users/{uid}/savedPosts` | Per-user saved posts |
| `users/{uid}/notifications` | Per-user activity inbox |
| `posts` | Family feed |
| `posts/{id}/comments`, `reactions` | Engagement |
| `calendarEvents` | Month-scoped stays |
| `bookingRequests` | Immutable booking audit trail |
| `houseTasks` | Shared task list |
| `albumMedia` | Photo archive metadata |
| `propertyStatus`, `propertyMapPins`, `propertyMapTrails`, `propertyResources`, `propertyInventory` | Owner-editable ops data |

Storage paths: `posts/`, `albums/`, `avatars/`, `users/{uid}/profile|family|pets/` — see `storage.rules`.

## Client architecture

```
app/page.tsx → AppExperience → ProtectedRoute → Dashboard
  ├── Providers: FeedPosts, SavedPosts, Notifications, PhotoAlbum
  ├── EcosystemProvider (in-app navigation)
  └── PropertyDataScope (lazy PropertyDataProvider per route)
```

**Realtime:** `onSnapshot` subscriptions in contexts; month-scoped calendar queries; staggered property listeners to avoid main-thread spikes.

**Mutations:** `runMutation()` for feed publish and booking submit; other writes use service functions with UI-level error banners (`SyncStatusBanner`).

**Notifications:** Client fan-out writes to recipient inboxes with `actorId == auth.uid`; dedupe doc IDs per type/entity/actor.

## Security model

- All Firestore reads require signed-in user (family-trust model).
- Property collections: **owner role** for writes.
- Posts/album/tasks/bookings: author-scoped creates; engagement rules allow controlled counter updates.
- Storage: image-only, size caps, path-specific filename patterns.

## Performance choices

- `next/dynamic` for heavy views (feed, calendar, map, album).
- Home calendar: single `HomeCalendarProvider` to avoid duplicate month listeners.
- Album images: client compression before upload.
- Feed/post images: Next `Image` where applicable.

## Not in scope (future)

- Cloud Functions (server fan-out, FCM push, email digests)
- Server-side auth middleware (currently client `ProtectedRoute`)
- Offline persistence (`enableIndexedDbPersistence`)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for shipping steps.
