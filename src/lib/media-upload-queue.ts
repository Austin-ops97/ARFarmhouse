/**
 * Serializes background media work so many picks don’t stack heavy decode/encode
 * on the same event loop turn, while still allowing limited parallel network uploads.
 */
const DEFAULT_CONCURRENCY = 2;

type Task<T> = () => Promise<T>;

class MediaUploadQueue {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly concurrency = DEFAULT_CONCURRENCY) {}

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

const globalQueue = new MediaUploadQueue(DEFAULT_CONCURRENCY);

export function enqueueMediaUploadTask<T>(task: Task<T>): Promise<T> {
  return globalQueue.enqueue(task);
}
