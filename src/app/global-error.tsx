"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[global-error]", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#0f1412] text-[#e8ece9] antialiased">
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-lg font-semibold">AR Farmhouse needs a moment</p>
          <p className="max-w-md text-sm opacity-80">
            Something unexpected happened at the app shell level. Reload to continue.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium"
          >
            Reload app
          </button>
        </div>
      </body>
    </html>
  );
}
