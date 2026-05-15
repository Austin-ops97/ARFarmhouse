/**
 * Yields to the browser so long image work does not freeze taps, scroll, or animations.
 */
type SchedulerWithYield = { yield: () => Promise<void> };

export function yieldToMainThread(): Promise<void> {
  const sched = (globalThis as typeof globalThis & { scheduler?: SchedulerWithYield }).scheduler;
  if (sched?.yield) {
    return sched.yield();
  }

  return new Promise((resolve) => {
    const defer = () => {
      if (typeof window !== "undefined") {
        window.setTimeout(resolve, 0);
      } else {
        globalThis.setTimeout(resolve, 0);
      }
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(defer);
    } else {
      defer();
    }
  });
}

/** Extra breath between heavy decode/encode steps — helps iOS Safari stay responsive. */
export function yieldWhenIdle(): Promise<void> {
  if (typeof requestIdleCallback === "function") {
    return new Promise((resolve) => {
      requestIdleCallback(() => void resolve(), { timeout: 80 });
    });
  }
  return yieldToMainThread();
}

/**
 * Runs async tasks with limited concurrency — avoids memory spikes on multi-photo picks.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]!, i);
      await yieldToMainThread();
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

/** Mobile Safari: one heavy decode at a time; desktop can pipeline two. */
export function imageProcessingConcurrency(): number {
  if (typeof navigator === "undefined") return 1;
  const mobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.matchMedia("(max-width: 768px)").matches);
  return mobile ? 1 : 2;
}

/** Lets the compositor paint optimistic UI before a CPU-heavy image pipeline starts. */
export async function deferMediaCpuWork(): Promise<void> {
  await yieldWhenIdle();
  await new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      resolve();
    }
  });
  await yieldToMainThread();
}
