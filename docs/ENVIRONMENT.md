# Environment variables

All client variables must be prefixed with `NEXT_PUBLIC_` so Next.js inlines them into the browser bundle. Reference each key **literally** in code (no dynamic `process.env[key]` lookups).

## Firebase (required)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `project-id.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | **Must match** Firebase Console → Storage → bucket id (typically `<project-id>.firebasestorage.app`). Legacy `<project-id>.appspot.com` env values are **auto-normalized** to `.firebasestorage.app` when they match `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. Cloud Functions triggers may still report `*.appspot.com` — that is the same default bucket resource as the `.firebasestorage.app` id. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Web app ID |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Web Push VAPID key (Firebase Console → Project settings → Cloud Messaging → **Web Push certificates**) — required for device token registration |

Read logic: `src/lib/firebase/env.ts` → `readPublicFirebaseConfig()`. VAPID: `src/lib/firebase/messaging.ts` → `readVapidKey()`.

## Auth registration gate

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_REGISTRATION_OPEN` | `false` | When `true`, anyone can sign up (still subject to allowlists below) |
| `NEXT_PUBLIC_SIGNUP_ALLOWLIST_EMAILS` | empty | Comma-separated emails allowed when open |
| `NEXT_PUBLIC_SIGNUP_ALLOWLIST_DOMAINS` | empty | Comma-separated email domains allowed when open |

Logic: `src/lib/auth-gate.ts`. **Also disable open signup in Firebase Console** for defense in depth.

## Invite codes (server-only — Cloud Functions secrets)

Invite codes are **never** stored in `NEXT_PUBLIC_*` env vars or frontend bundles. Validation runs in the callable Cloud Function `validateInviteCode`.

| Secret | Description |
|--------|-------------|
| `INVITE_PEPPER` | Long random string (32+ chars). Required to verify stored hashes. |
| `INVITE_CODE_HASHES` | Comma-separated scrypt hashes from `functions/scripts/hash-invite-code.mjs` |

### Generate a hash (local; do not commit the plaintext code)

```bash
# Pick a pepper once and store it as a Firebase secret
openssl rand -base64 32

INVITE_PEPPER='your-pepper' node functions/scripts/hash-invite-code.mjs 'your-invite-code'
```

### Deploy secrets (production)

```bash
firebase functions:secrets:set INVITE_PEPPER
firebase functions:secrets:set INVITE_CODE_HASHES
npm run firebase:deploy:functions
npm run firebase:deploy   # deploy Firestore rules (signupRedemptions enforcement)
```

Rotate codes by appending a new hash to `INVITE_CODE_HASHES` (multiple hashes supported), then removing old hashes after migration.

Optional local emulator: set `NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR=true` and run the Functions emulator with the same secrets.

## Site URL (recommended for production)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Canonical HTTPS origin, e.g. `https://arfarmhouse.example.com` — no trailing slash |

Used for post deep links (`src/lib/app-url.ts`) and notification deep links. Without it, share UI shows a setup hint.

## Cloud Functions (push deep links)

| Variable | Description |
|----------|-------------|
| `SITE_ORIGIN` | Canonical HTTPS origin (no trailing slash), e.g. `https://arfarmhouse.example.com` — used when building push `deepLink` URLs in `functions/src/notifications/dispatch.ts` |

Set via `functions/.env` (copy from `functions/.env.example`; gitignored — loaded by Firebase CLI on deploy/emulator), or Firebase Console → **Functions** → **Environment variables** for CI deploys without a local `.env`.

## Local development

```bash
cp .env.example .env.local
# fill values from Firebase console → Project settings → Your apps
npm run dev
```

Never commit `.env.local`.

## Vercel

Set the same keys for **Production** and optionally different Firebase projects for **Preview** branches.

**Storage uploads:** `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` on Vercel must equal the bucket string from the Firebase Console (usually `<project-id>.firebasestorage.app`). Mismatched or stale `.appspot.com` defaults cause `storage/unauthorized` even when Auth and Firestore work.
