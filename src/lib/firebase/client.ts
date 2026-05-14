"use client";

import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

import { readPublicFirebaseConfig } from "@/lib/firebase/env";

let app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  const cfg = readPublicFirebaseConfig();
  if (!cfg) {
    throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to `.env.local`.");
  }
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(cfg);
  }
  return app;
}

export function tryGetFirebaseApp(): FirebaseApp | null {
  const cfg = readPublicFirebaseConfig();
  if (!cfg) return null;
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(cfg);
  }
  return app;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function tryGetFirebaseAuth() {
  const a = tryGetFirebaseApp();
  return a ? getAuth(a) : null;
}

export function getFirestoreDb() {
  return getFirestore(getFirebaseApp());
}

export function tryGetFirestoreDb() {
  const a = tryGetFirebaseApp();
  return a ? getFirestore(a) : null;
}

export function getFirebaseStorage() {
  return getStorage(getFirebaseApp());
}

export function tryGetFirebaseStorage() {
  const a = tryGetFirebaseApp();
  return a ? getStorage(a) : null;
}
