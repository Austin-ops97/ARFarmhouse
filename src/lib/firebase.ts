import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

import { readPublicFirebaseConfig } from "@/lib/firebase/env";

/**
 * Lazy init (no module-level singleton). Avoids evaluating Firebase when
 * `NEXT_PUBLIC_*` is unavailable during SSR of client bundles, and keeps
 * server/client aligned with fresh `readPublicFirebaseConfig()` reads.
 */
function resolveFirebaseApp(): FirebaseApp | null {
  const cfg = readPublicFirebaseConfig();
  if (!cfg) return null;
  try {
    return getApps().length > 0 ? getApp() : initializeApp(cfg);
  } catch {
    return null;
  }
}

export function getFirebaseApp(): FirebaseApp {
  const app = resolveFirebaseApp();
  if (!app) {
    throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to `.env.local`.");
  }
  return app;
}

export function tryGetFirebaseApp(): FirebaseApp | null {
  return resolveFirebaseApp();
}

export function getFirebaseAuth(): Auth {
  const app = resolveFirebaseApp();
  if (!app) {
    throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to `.env.local`.");
  }
  return getAuth(app);
}

export function tryGetFirebaseAuth(): Auth | null {
  const app = resolveFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getFirestoreDb(): Firestore {
  const app = resolveFirebaseApp();
  if (!app) {
    throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to `.env.local`.");
  }
  return getFirestore(app);
}

export function tryGetFirestoreDb(): Firestore | null {
  const app = resolveFirebaseApp();
  return app ? getFirestore(app) : null;
}

export function getFirebaseStorage(): FirebaseStorage {
  const app = resolveFirebaseApp();
  if (!app) {
    throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to `.env.local`.");
  }
  return getStorage(app);
}

export function tryGetFirebaseStorage(): FirebaseStorage | null {
  const app = resolveFirebaseApp();
  if (!app) return null;
  const cfg = readPublicFirebaseConfig();
  if (!cfg?.storageBucket) return null;
  try {
    return getStorage(app);
  } catch {
    return null;
  }
}

/** True when Storage bucket is configured and the client SDK initialized successfully. */
export function isFirebaseStorageAvailable(): boolean {
  return tryGetFirebaseStorage() !== null;
}
