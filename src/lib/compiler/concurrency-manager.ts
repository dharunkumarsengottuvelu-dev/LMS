/**
 * Compiler Concurrency & Queue Manager
 *
 * Limits simultaneous CPU/Sandbox heavy execution processes.
 * When concurrent requests exceed capacity, queues requests in a priority FIFO queue.
 * Distinguishes queue wait from execution timeout and reports Execution Service Busy
 * when queue timeout is exceeded.
 */

interface QueuedTask<T> {
  id: string;
  enqueuedAt: number;
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
  maxWaitTimer: NodeJS.Timeout;
}

export class CompilerConcurrencyManager {
  private static MAX_CONCURRENT = 12; // Maximum concurrent compiler instances
  private static MAX_QUEUE_WAIT_MS = 10000; // 10 seconds max queue wait before "BUSY" error
  private static activeCount = 0;
  private static queue: QueuedTask<any>[] = [];

  public static getStats() {
    return {
      activeCount: this.activeCount,
      queueLength: this.queue.length,
      maxConcurrent: this.MAX_CONCURRENT,
      status: this.queue.length > 8 ? "BUSY" : this.activeCount > 8 ? "DEGRADED" : "HEALTHY",
    };
  }

  /**
   * Executes a task within concurrency bounds or queues it.
   */
  public static async runWithConcurrency<T>(
    taskId: string,
    onQueueWaitRecorded?: (waitMs: number) => void,
    taskFn?: () => Promise<T>
  ): Promise<T> {
    if (!taskFn) {
      throw new Error("taskFn is required");
    }

    // Fast-path: immediate execution if capacity is available
    if (this.activeCount < this.MAX_CONCURRENT && this.queue.length === 0) {
      this.activeCount++;
      try {
        return await taskFn();
      } finally {
        this.activeCount--;
        this.processNext();
      }
    }

    // Enqueue task
    const enqueuedAt = Date.now();
    return new Promise<T>((resolve, reject) => {
      const maxWaitTimer = setTimeout(() => {
        // Remove from queue
        const idx = this.queue.findIndex((t) => t.id === taskId);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
        }
        const waitMs = Date.now() - enqueuedAt;
        const err = new Error(
          `Execution Service Busy: Compiler queue wait time exceeded (${(waitMs / 1000).toFixed(1)}s). Please retry in a few seconds.`
        );
        (err as any).isQueueTimeout = true;
        reject(err);
      }, this.MAX_QUEUE_WAIT_MS);

      this.queue.push({
        id: taskId,
        enqueuedAt,
        run: taskFn,
        resolve,
        reject,
        maxWaitTimer,
      });
    });
  }

  private static processNext() {
    if (this.queue.length === 0 || this.activeCount >= this.MAX_CONCURRENT) {
      return;
    }

    const nextTask = this.queue.shift();
    if (!nextTask) return;

    clearTimeout(nextTask.maxWaitTimer);
    this.activeCount++;

    nextTask
      .run()
      .then((res) => {
        nextTask.resolve(res);
      })
      .catch((err) => {
        nextTask.reject(err);
      })
      .finally(() => {
        this.activeCount--;
        this.processNext();
      });
  }
}
