"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[app/error]", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="font-heading text-xl font-semibold text-foreground">We could not load this page</p>
      <p className="max-w-md text-sm text-muted-foreground">
        A recoverable error occurred. Try again — if it persists, sign out and back in.
      </p>
      <Button type="button" className="rounded-full" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
