/**
 * Limits concurrent finalize pipelines (optimize + Storage + Firestore) so mobile Safari
 * doesn’t decode/compress multiple giant camera rolls at once.
 */
import { imageProcessingConcurrency } from "@/lib/image-scheduler";

type Task<T> = () => Promise<T>;

class MediaUploadQueue {
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

const globalQueue = new MediaUploadQueue(imageProcessingConcurrency());

export function enqueueMediaUploadTask<T>(task: Task<T>): Promise<T> {
  return globalQueue.enqueue(task);
}
