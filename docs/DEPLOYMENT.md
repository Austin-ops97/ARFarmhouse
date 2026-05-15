# AR Farmhouse — Deployment

## Overview

| Surface | Host | Config |
|---------|------|--------|
| Web app | [Vercel](https://vercel.com) (recommended) | `NEXT_PUBLIC_*` env vars |
| Auth, Firestore, Storage | Firebase | `firebase.json`, rules, indexes |

## Prerequisites

1. Firebase project with **Authentication** (Email/Password), **Firestore**, and **Storage** enabled.
2. Vercel project linked to this repository.
3. Firebase CLI: `npm i -g firebase-tools` and `firebase login`.

## Environment variables (Vercel)

Copy `.env.example` → set all values in Vercel **Project → Settings → Environment Variables** for Production and Preview.

Required for the app to function:

- All `NEXT_PUBLIC_FIREBASE_*` keys
- `NEXT_PUBLIC_REGISTRATION_OPEN` (recommend `false` in production)
- `NEXT_PUBLIC_SITE_URL` (your canonical URL, no trailing slash — used for post share links)

See [ENVIRONMENT.md](./ENVIRONMENT.md) for details.

## Firebase rules and indexes

From the repo root:

```bash
firebase use <your-project-id>
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Or use npm scripts after installing the CLI:

```bash
npm run firebase:deploy
```

**First deploy:** open the Firebase console if Firestore prompts you to create composite indexes from query errors; `firestore.indexes.json` includes the calendar month composite index.

## Vercel deploy

1. Connect the Git repository.
2. Framework preset: **Next.js**.
3. Build command: `npm run build` (default).
4. Install command: `npm install`.
5. Add environment variables (see above).
6. Deploy `main` (or your production branch).

## Post-deploy checklist

- [ ] Sign in with a family account on production URL
- [ ] Create a test booking (calendar) and confirm it appears for another user
- [ ] Upload a feed image and album photo; confirm Storage rules allow only images
- [ ] Open notification bell after another user comments
- [ ] Confirm `NEXT_PUBLIC_SITE_URL` share links copy correctly
- [ ] Lock registration in Firebase Console if not using open signup
- [ ] Assign `role: owner` on one `users/{uid}` doc for property map/resource edits

## Rollback

- **Vercel:** redeploy a previous deployment from the dashboard.
- **Firebase rules:** revert `firestore.rules` / `storage.rules` in git and redeploy.

## Local production smoke test

```bash
npm run build && npm run start
```

Use `.env.local` with the same keys as production (or a staging Firebase project).
