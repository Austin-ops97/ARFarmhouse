/**
 * HARD transport diagnostics around Firebase Storage `uploadBytes` / `uploadBytesResumable`.
 * Always logs `[storage]` — no localStorage gate — for production mobile Safari sessions.
 */

import type { UploadTask } from "firebase/storage";

import { tryGetFirebaseAuth } from "@/lib/firebase";

/** Diagnostic hang boundary — logs only; does not cancel the SDK upload. */
export const STORAGE_UPLOAD_HANG_LOG_MS = 60_000;

export type StorageUploadTransportMethod = "uploadBytes" | "uploadBytesResumable";

export type StorageAuthSnapshot = {
  hasAuthInstance: boolean;
  uid: string | null;
  hasCurrentUser: boolean;
  tokenExists: boolean;
  tokenError?: string;
};

/** Always-on `[storage]` line for transport/runtime diagnosis. */
export function storageTransportLog(message: string, detail?: Record<string, unknown>): void {
  if (detail !== undefined) {
    console.log(`[storage] ${message}`, detail);
  } else {
    console.log(`[storage] ${message}`);
  }
}

export async function snapshotStorageAuth(): Promise<StorageAuthSnapshot> {
  const auth = tryGetFirebaseAuth();
  const user = auth?.currentUser ?? null;
  let tokenExists = false;
  let tokenError: string | undefined;
  if (user) {
    try {
      const token = await user.getIdToken(false);
      tokenExists = Boolean(token);
    } catch (e) {
      tokenError = e instanceof Error ? e.message : String(e);
    }
  }
  return {
    hasAuthInstance: Boolean(auth),
    uid: user?.uid ?? null,
    hasCurrentUser: Boolean(user),
    tokenExists,
    tokenError,
  };
}

function logPreUploadContext(
  method: StorageUploadTransportMethod,
  storagePath: string,
  fileSize: number,
  mime: string,
  auth: StorageAuthSnapshot
): void {
  storageTransportLog("pre-upload context", {
    method,
    storagePath,
    fileSize,
    mime: mime || "unknown",
    authUid: auth.uid,
    hasCurrentUser: auth.hasCurrentUser,
    tokenExists: auth.tokenExists,
    tokenError: auth.tokenError,
  });
  storageTransportLog("auth user", { uid: auth.uid ?? "(none)" });
  storageTransportLog("token exists", { value: auth.tokenExists });
  storageTransportLog("file size", { bytes: fileSize });
  storageTransportLog("mime", { type: mime || "unknown" });
  storageTransportLog("path", { storagePath });
  storageTransportLog("upload method", { method });
}

type UploadSettlement = "pending" | "resolved" | "rejected";

/**
 * Wraps a Firebase upload promise with explicit resolve/reject/hang logging and auth snapshots.
 */
export async function traceStorageUploadPromise<T>(
  method: StorageUploadTransportMethod,
  storagePath: string,
  fileSize: number,
  mime: string,
  uploadPromise: Promise<T>
): Promise<T> {
  const authBefore = await snapshotStorageAuth();
  logPreUploadContext(method, storagePath, fileSize, mime, authBefore);

  let settlement: UploadSettlement = "pending";
  let hangLogged = false;
  let visibilityListener: (() => void) | undefined;

  const hangTimer =
    typeof window !== "undefined"
      ? window.setTimeout(() => {
          if (settlement !== "pending") return;
          hangLogged = true;
          storageTransportLog("upload promise hung", {
            method,
            storagePath,
            hangMs: STORAGE_UPLOAD_HANG_LOG_MS,
            settlement,
          });
          void snapshotStorageAuth().then((authMid) => {
            storageTransportLog("auth snapshot at hang", {
              uid: authMid.uid,
              hasCurrentUser: authMid.hasCurrentUser,
              tokenExists: authMid.tokenExists,
              tokenError: authMid.tokenError,
            });
          });
        }, STORAGE_UPLOAD_HANG_LOG_MS)
      : undefined;

  if (typeof document !== "undefined") {
    visibilityListener = () => {
      storageTransportLog("document visibility during upload", {
        visibility: document.visibilityState,
        method,
        storagePath,
        settlement,
      });
    };
    document.addEventListener("visibilitychange", visibilityListener);
  }

  storageTransportLog("before upload", { method, storagePath });

  try {
    const result = await uploadPromise;
    settlement = "resolved";
    storageTransportLog("upload resolved", {
      method,
      storagePath,
      hungFirst: hangLogged,
    });
    if (hangLogged) {
      storageTransportLog("upload resolved after hang log", { method, storagePath });
    }
    return result;
  } catch (err) {
    settlement = "rejected";
    console.error("[storage] upload rejected", err);
    storageTransportLog("upload rejected detail", {
      method,
      storagePath,
      message: err instanceof Error ? err.message : String(err),
      hungFirst: hangLogged,
    });
    throw err;
  } finally {
    if (hangTimer !== undefined) window.clearTimeout(hangTimer);
    if (visibilityListener && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", visibilityListener);
    }
    const authAfter = await snapshotStorageAuth();
    storageTransportLog("after upload", {
      method,
      storagePath,
      settlement,
      hungLogged: hangLogged,
      authUidAfter: authAfter.uid,
      tokenExistsAfter: authAfter.tokenExists,
      authLost: authBefore.hasCurrentUser && !authAfter.hasCurrentUser,
      tokenLost: authBefore.tokenExists && !authAfter.tokenExists,
    });
    if (authBefore.uid !== authAfter.uid) {
      storageTransportLog("auth uid changed during upload", {
        before: authBefore.uid,
        after: authAfter.uid,
      });
    }
  }
}

/** Logs resumable task lifecycle — call when `uploadBytesResumable` returns the task. */
export function traceStorageResumableTaskCreated(
  storagePath: string,
  fileSize: number,
  mime: string,
  task: UploadTask
): void {
  void snapshotStorageAuth().then((auth) => {
    logPreUploadContext("uploadBytesResumable", storagePath, fileSize, mime, auth);
    storageTransportLog("before upload (resumable task created)", {
      storagePath,
      initialState: task.snapshot?.state ?? "unknown",
    });
  });
}

export function traceStorageResumableState(
  storagePath: string,
  detail: Record<string, unknown>
): void {
  storageTransportLog("resumable state_changed", { storagePath, ...detail });
}

export function traceStorageResumableSuccess(storagePath: string): void {
  storageTransportLog("upload resolved (resumable success callback)", { storagePath });
  storageTransportLog("after upload (resumable)", { storagePath, settlement: "resolved" });
}

export function traceStorageResumableError(storagePath: string, err: unknown): void {
  console.error("[storage] upload rejected (resumable error callback)", err);
  storageTransportLog("after upload (resumable)", {
    storagePath,
    settlement: "rejected",
    message: err instanceof Error ? err.message : String(err),
  });
}

/** 60s hang watchdog for resumable uploads that never reach success/error. */
export function startStorageResumableHangWatch(
  storagePath: string,
  isSettled: () => boolean
): () => void {
  if (typeof window === "undefined") return () => {};
  const id = window.setTimeout(() => {
    if (isSettled()) return;
    storageTransportLog("upload promise hung", {
      method: "uploadBytesResumable",
      storagePath,
      hangMs: STORAGE_UPLOAD_HANG_LOG_MS,
    });
    void snapshotStorageAuth().then((auth) => {
      storageTransportLog("auth snapshot at hang (resumable)", {
        uid: auth.uid,
        tokenExists: auth.tokenExists,
      });
    });
  }, STORAGE_UPLOAD_HANG_LOG_MS);
  return () => window.clearTimeout(id);
}
