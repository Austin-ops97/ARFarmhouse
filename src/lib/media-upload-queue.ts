/**
 * Serializes CPU-heavy decode/compress-only work so Safari does not run multiple giant
 * `createImageBitmap`/`canvas` pipelines at once. Storage + Firestore finalize **outside**
 * this queue so long network uploads cannot block parallel jobs (feed vs album).
 */
import { imageProcessingConcurrency } from "@/lib/image-scheduler";
type Task<T> = () => Promise<T>;

class MediaCpuQueue {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly concurrency: number) {}

  async enqueue<T>(task: Task<T>): Promise<T> {
    while (this.active >= this.concurrency) {
      await new Promise<void>((r) => this.waiters.push(r));
    }
    this.active += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
      this.waiters.shift()?.();
    }
  }
}

const cpuQueue = new MediaCpuQueue(imageProcessingConcurrency());

/** Decode + optimize only — never wrap full Storage uploads (see docs on class). */
export function enqueueCpuBoundMediaTask<T>(task: Task<T>): Promise<T> {
  return cpuQueue.enqueue(task);
}

/**
 * Fire-and-forget async task (no global mutex over network). Prefer {@link enqueueCpuBoundMediaTask}
 * for heavyweight decode/compress batches so simultaneous jobs do not contend on CPU.
 */
export function enqueueMediaUploadTask<T>(task: Task<T>): Promise<T> {
  return Promise.resolve().then(task);
}
