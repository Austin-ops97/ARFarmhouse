# Environment variables

All client variables must be prefixed with `NEXT_PUBLIC_` so Next.js inlines them into the browser bundle. Reference each key **literally** in code (no dynamic `process.env[key]` lookups).

## Firebase (required)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `project-id.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | **Must match** Firebase Console → Storage → bucket id (typically `<project-id>.firebasestorage.app`). Legacy `<project-id>.appspot.com` env values are **auto-normalized** to `.firebasestorage.app` when they match `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. Cloud Functions triggers may still report `*.appspot.com` — that is the same default bucket resource as the `.firebasestorage.app` id. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID (future push) |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Web app ID |

Read logic: `src/lib/firebase/env.ts` → `readPublicFirebaseConfig()`.

## Auth registration gate

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_REGISTRATION_OPEN` | `false` | When `true`, anyone can sign up (still subject to allowlists below) |
| `NEXT_PUBLIC_SIGNUP_ALLOWLIST_EMAILS` | empty | Comma-separated emails allowed when open |
| `NEXT_PUBLIC_SIGNUP_ALLOWLIST_DOMAINS` | empty | Comma-separated email domains allowed when open |

Logic: `src/lib/auth-gate.ts`. **Also disable open signup in Firebase Console** for defense in depth.

## Site URL (recommended for production)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Canonical HTTPS origin, e.g. `https://arfarmhouse.example.com` — no trailing slash |

Used for post deep links (`src/lib/app-url.ts`). Without it, share UI shows a setup hint.

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
