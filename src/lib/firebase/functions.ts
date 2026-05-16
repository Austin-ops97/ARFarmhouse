import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";

import { tryGetFirebaseApp } from "@/lib/firebase";

const FUNCTIONS_REGION = "us-central1";

let functionsInstance: Functions | null = null;
let emulatorConnected = false;

export function tryGetFirebaseFunctions(): Functions | null {
  const app = tryGetFirebaseApp();
  if (!app) return null;

  if (!functionsInstance) {
    functionsInstance = getFunctions(app, FUNCTIONS_REGION);

    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR === "true" &&
      !emulatorConnected
    ) {
      try {
        connectFunctionsEmulator(functionsInstance, "127.0.0.1", 5001);
        emulatorConnected = true;
      } catch {
        /* already connected */
      }
    }
  }

  return functionsInstance;
}
