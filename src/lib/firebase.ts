"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

import { readPublicFirebaseConfig } from "@/lib/firebase/env";

/**
 * Resolves the default Firebase app using the Firebase JS singleton registry.
 * Safe with Next.js dev HMR: re-imports call getApp() when an app already exists.
 */
function resolveFirebaseApp(): FirebaseApp | null {
  const cfg = readPublicFirebaseConfig();
  if (!cfg) return null;
  return getApps().length > 0 ? getApp() : initializeApp(cfg);
}

export const firebaseApp: FirebaseApp | null = resolveFirebaseApp();

export const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

export const db: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;

export const storage: FirebaseStorage | null = firebaseApp ? getStorage(firebaseApp) : null;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to `.env.local`.");
  }
  return firebaseApp;
}

export function tryGetFirebaseApp(): FirebaseApp | null {
  return firebaseApp;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to `.env.local`.");
  }
  return auth;
}

export function tryGetFirebaseAuth(): Auth | null {
  return auth;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to `.env.local`.");
  }
  return db;
}

export function tryGetFirestoreDb(): Firestore | null {
  return db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to `.env.local`.");
  }
  return storage;
}

export function tryGetFirebaseStorage(): FirebaseStorage | null {
  return storage;
}
