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

/**
 * Read public Firebase web config.
 *
 * IMPORTANT: each `process.env.NEXT_PUBLIC_*` must be referenced **literally**
 * (not via a dynamic key). Next.js replaces only static accesses when inlining
 * env into the client bundle; `process.env[someVariable]` stays undefined in the browser.
 */
export function readPublicFirebaseConfig(): PublicFirebaseConfig | null {
  const apiKey = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  const authDomain = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
  const projectId = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  const storageBucket = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  const messagingSenderId = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
  const appId = normalizeEnvValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID);

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

export function isFirebaseConfigured(): boolean {
  return readPublicFirebaseConfig() !== null;
}
