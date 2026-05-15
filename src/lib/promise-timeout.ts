/**
 * Rejects if `p` does not settle within `ms` — use for operations that may never resolve (Safari toBlob, Storage URL).
 */
export function promiseWithTimeout<T>(
  p: Promise<T>,
  ms: number,
  onTimeout: () => void
): Promise<T> {
  if (typeof window === "undefined") {
    return p;
  }

  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      onTimeout();
      reject(new Error(`Timed out after ${ms} ms`));
    }, ms);

    p.then(
      (v) => {
        window.clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      }
    );
  });
}
