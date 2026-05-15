/** Lightweight first-paint shell while the main client bundle hydrates. */
export function StartupShell({ label = "Loading app" }: { label?: string }) {
  return (
    <div
      className="relative min-h-dvh overflow-hidden bg-background"
      role="status"
      aria-busy="true"
      aria-label={label}
    >
      <div className="absolute inset-0 z-30 min-h-dvh bg-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 p-6 pt-24">
          <div className="h-12 w-64 max-w-full animate-pulse rounded-2xl bg-muted/50 dark:bg-white/[0.06]" />
          <div className="mt-8 h-[min(40vh,360px)] w-full animate-pulse rounded-[1.35rem] bg-muted/40 dark:bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}
