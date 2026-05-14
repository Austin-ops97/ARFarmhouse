const keys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export type PublicFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

/** Normalize values from .env / deployment (BOM, quotes, stray whitespace). */
function normalizeEnvValue(raw: string | undefined): string {
  if (raw == null) return "";
  let v = raw.replace(/^\uFEFF/, "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function readPublicFirebaseConfig(): PublicFirebaseConfig | null {
  const values = keys.map((k) => normalizeEnvValue(process.env[k]));
  if (values.some((v) => !v)) return null;
  return {
    apiKey: values[0],
    authDomain: values[1],
    projectId: values[2],
    storageBucket: values[3],
    messagingSenderId: values[4],
    appId: values[5],
  };
}

export function isFirebaseConfigured(): boolean {
  return readPublicFirebaseConfig() !== null;
}
