import { getApp, getApps } from "firebase/app";
import type { Auth } from "firebase/auth";

import { readPublicFirebaseConfig } from "@/lib/firebase/env";

/** Enable with `NEXT_PUBLIC_AUTH_DEBUG=true`. */
export function isAuthDebugEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_AUTH_DEBUG?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

export type AuthDebugContext = {
  op: "signup" | "signin" | "signout" | "reset-password" | "profile-bootstrap" | "profile-sync";
  email: string;
  passwordLength: number;
};

function authPersistenceLabel(auth: Auth | null): string | null {
  if (!auth) return null;
  try {
    const persistence = (auth as Auth & { _getPersistence?: () => unknown })._getPersistence?.();
    if (!persistence) return "default";
    const name =
      persistence && typeof persistence === "object" && "type" in persistence
        ? String((persistence as { type?: string }).type ?? "")
        : "";
    return name || "configured";
  } catch {
    return "unknown";
  }
}

export function logAuthDebug(
  auth: Auth | null,
  ctx: AuthDebugContext,
  extra?: Record<string, unknown>
): void {
  if (!isAuthDebugEnabled()) return;

  const cfg = readPublicFirebaseConfig();
  const apps = getApps();
  const app = apps.length > 0 ? getApp() : null;

  console.info("[auth:debug]", {
    op: ctx.op,
    email: ctx.email,
    passwordLength: ctx.passwordLength,
    firebase: {
      configuredProjectId: cfg?.projectId ?? null,
      configuredAuthDomain: cfg?.authDomain ?? null,
      appName: app?.name ?? null,
      appCount: apps.length,
      authAppName: auth?.app?.name ?? null,
      authProjectId: auth?.app?.options?.projectId ?? null,
      authCurrentUid: auth?.currentUser?.uid ?? null,
      persistence: authPersistenceLabel(auth),
    },
    ...extra,
  });
}

export function logAuthDebugError(
  auth: Auth | null,
  ctx: AuthDebugContext,
  err: unknown,
  extra?: Record<string, unknown>
): void {
  if (!isAuthDebugEnabled()) return;

  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code ?? "")
      : "";
  const message = err instanceof Error ? err.message : String(err);

  console.warn("[auth:debug:error]", {
    op: ctx.op,
    email: ctx.email,
    passwordLength: ctx.passwordLength,
    code: code || null,
    message,
    authAppName: auth?.app?.name ?? null,
    authProjectId: auth?.app?.options?.projectId ?? null,
    ...extra,
  });
}
