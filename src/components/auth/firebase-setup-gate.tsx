"use client";

/**
 * Shown when Firebase public env vars are missing.
 * Matches the calm, premium shell of the app without altering login UI styling.
 */
export function FirebaseSetupGate() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[420px] rounded-[2rem] border border-border/55 bg-card/80 p-8 text-center shadow-[var(--ar-float-elevate)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.04] sm:p-10">
        <p className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Connect Firebase
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Add your web app keys to <code className="text-foreground/90">.env.local</code> using the{" "}
          <code className="text-foreground/90">NEXT_PUBLIC_FIREBASE_*</code> variables, then restart the dev server.
        </p>
      </div>
    </div>
  );
}
