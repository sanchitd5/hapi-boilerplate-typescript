/**
 * Processing Queue with Backpressure
 * Manages task execution with controlled concurrency to prevent memory overload.
 */
import { EventEmitter } from 'events';
import MemoryMonitor from './memoryMonitor';
import os from 'os';

export interface TaskOptions {
  priority?: number; // Higher number = higher priority
  timeout?: number;  // Task timeout in ms
  retries?: number;  // Number of retries on failure
}

export interface Task {
  id: string;
  fn: (...args: any[]) => Promise<any>;
  args: any[];
  options: TaskOptions;
  createdAt: number;
}

class ProcessingQueue extends EventEmitter {
  private queue: Task[] = [];
  private processing: Set<string> = new Set();
  private paused: boolean = false;
  
  // Default configuration
  private config = {
    concurrency: Math.max(1, Math.floor(os.cpus().length / 2)), // Default to half of CPU cores
    memoryThreshold: 80, // Pause queue if memory usage exceeds this percentage
    priorityQueue: true, // Enable priority-based processing
    defaultTimeout: 60000, // 60 seconds
    defaultRetries: 3,
  };

  private static maxConcurrency: number = 3;
  private static minConcurrency: number = 1;
  private static currentConcurrency: number = ProcessingQueue.maxConcurrency;
  private static isPaused: boolean = false;
  private static resumeTimeout: NodeJS.Timeout | null = null;
  private static currentTasks: number = 0;
  private static retryCount: number = 0;

  constructor() {
    super();
    this.setupMemoryMonitoring();
  }

  /**
   * Configure the processing queue
   */
  configure(options: Partial<typeof this.config>) {
    this.config = { ...this.config, ...options };
    return this;
  }

  /**
   * Set up memory monitoring to implement backpressure
   */
  private setupMemoryMonitoring() {
    MemoryMonitor.on('warning', (stats) => {
      if (this.queue.length > 0 && this.config.concurrency > 1) {
        // Reduce concurrency temporarily when memory usage is high
        const oldConcurrency = this.config.concurrency;
        this.config.concurrency = Math.max(1, Math.floor(this.config.concurrency / 2));
        appLogger.warn(`Memory pressure: reducing concurrency from ${oldConcurrency} to ${this.config.concurrency}`);
      }
    });

    MemoryMonitor.on('critical', (stats) => {
      // On critical memory, reduce concurrency to minimum but keep processing
      if (this.config.concurrency > 1) {
        const oldConcurrency = this.config.concurrency;
        this.config.concurrency = 1;
        appLogger.error(`Critical memory: reducing concurrency from ${oldConcurrency} to ${this.config.concurrency}`);
      }

      // Force GC if available
      if (global.gc) {
        global.gc();
        appLogger.info('Forced garbage collection due to critical memory');
      }
    });

    MemoryMonitor.on('normal', () => {
      // Reset concurrency to default when memory returns to normal
      if (this.config.concurrency < Math.floor(os.cpus().length / 2)) {
        const oldConcurrency = this.config.concurrency;
        this.config.concurrency = Math.max(1, Math.floor(os.cpus().length / 2));
        appLogger.info(`Memory pressure relieved: resetting concurrency from ${oldConcurrency} to ${this.config.concurrency}`);
      }
    });
  }

  /**
   * Add a task to the processing queue
   */
  enqueue<T>(id: string, fn: (...args: any[]) => Promise<T>, args: any[] = [], options: TaskOptions = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: Task = {
        id,
        fn,
        args,
        options: {
          priority: options.priority || 0,
          timeout: options.timeout || this.config.defaultTimeout,
          retries: options.retries !== undefined ? options.retries : this.config.defaultRetries
        },
        createdAt: Date.now()
      };

      // Add task to queue
      if (this.config.priorityQueue) {
        // Insert based on priority
        const index = this.queue.findIndex(t => t.options.priority! < task.options.priority!);
        if (index === -1) {
          this.queue.push(task);
        } else {
          this.queue.splice(index, 0, task);
        }
      } else {
        this.queue.push(task);
      }

      // Set up event listeners for this task
      const onComplete = (result: T) => {
        this.removeTaskListeners(id, onComplete, onError);
        resolve(result);
      };

      const onError = (error: Error) => {
        this.removeTaskListeners(id, onComplete, onError);
        reject(error);
      };

      this.on(`task:${id}:complete`, onComplete);
      this.on(`task:${id}:error`, onError);

      // Process queue
      this.processQueue();
    });
  }

  private removeTaskListeners(id: string, onComplete: Function, onError: Function) {
    this.removeListener(`task:${id}:complete`, onComplete as any);
    this.removeListener(`task:${id}:error`, onError as any);
  }

  /**
   * Process tasks in the queue
   */
  private async processQueue() {
    if (this.paused) return;

    while (this.queue.length > 0 && this.processing.size < this.config.concurrency) {
      const task = this.queue.shift();
      if (!task) continue;

      this.processing.add(task.id);
      
      // Create timeout controller
      const timeoutId = setTimeout(() => {
        this.emit(`task:${task.id}:error`, new Error(`Task ${task.id} timed out after ${task.options.timeout}ms`));
        this.processing.delete(task.id);
        this.processQueue();
      }, task.options.timeout);

      try {
        const result = await task.fn(...task.args);
        
        // Clear timeout since task completed
        clearTimeout(timeoutId);
        
        // Emit completion
        this.emit(`task:${task.id}:complete`, result);
      } catch (error) {
        // Clear timeout
        clearTimeout(timeoutId);
        
        // Handle retries
        if (task.options.retries && task.options.retries > 0) {
          appLogger.warn(`Task ${task.id} failed, retrying (${task.options.retries} attempts left)`);
          // Re-enqueue with one less retry
          this.queue.unshift({
            ...task,
            options: { ...task.options, retries: task.options.retries - 1 }
          });
        } else {
          // No more retries, emit error
          this.emit(`task:${task.id}:error`, error);
        }
      } finally {
        // Always clean up
        this.processing.delete(task.id);
      }
      
      // Process next task
      this.processQueue();
    }
  }

  /**
   * Pause queue processing
   */
  pause() {
    this.paused = true;
    this.emit('paused');
    return this;
  }

  /**
   * Pause all queued and running tasks
   */
  pauseAll() {
    this.pause();
    // Store current processing tasks to resume later if needed
    this.emit('allPaused', Array.from(this.processing));
    // Clear processing set
    this.processing.clear();
    return this;
  }

  /**
   * Resume queue processing
   */
  resume() {
    this.paused = false;
    this.emit('resumed');
    this.processQueue();
    return this;
  }

  /**
   * Get queue status
   */
  status() {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      paused: this.paused,
      concurrency: this.config.concurrency
    };
  }
  
  /**
   * Clear all queued tasks that haven't started yet
   */
  clear() {
    const count = this.queue.length;
    this.queue = [];
    appLogger.info(`Cleared ${count} tasks from queue`);
    return count;
  }

  static pauseAll() {
    ProcessingQueue.isPaused = true;
    ProcessingQueue.currentConcurrency = ProcessingQueue.minConcurrency;
    
    // Clear existing resume timeout if any
    if (ProcessingQueue.resumeTimeout) {
      clearTimeout(ProcessingQueue.resumeTimeout);
    }
    
    // Set resume timeout with progressive concurrency restoration
    ProcessingQueue.resumeTimeout = setTimeout(() => {
      ProcessingQueue.isPaused = false;
      // Start with minimum concurrency
      ProcessingQueue.currentConcurrency = ProcessingQueue.minConcurrency;
      
      // Gradually increase concurrency if memory allows
      const increaseInterval = setInterval(() => {
        const used = process.memoryUsage();
        const heapUsedPercent = (used.heapUsed / used.heapTotal) * 100;
        
        if (heapUsedPercent < 65 && ProcessingQueue.currentConcurrency < ProcessingQueue.maxConcurrency) {
          ProcessingQueue.currentConcurrency++;
        } else {
          clearInterval(increaseInterval);
        }
      }, 5000);
    }, 10000);
  }

  static async addTask(task: any) {
    if (!ProcessingQueue.isPaused && ProcessingQueue.currentTasks < ProcessingQueue.currentConcurrency) {
      try {
        ProcessingQueue.currentTasks++;
        await task();
      } catch (error) {
        appLogger.error('Task processing error:', error);
      } finally {
        ProcessingQueue.currentTasks--;
        // Clear task references to help GC
        task = null;
        if (global.gc && ProcessingQueue.currentTasks === 0) {
          global.gc();
        }
      }
    } else {
      // Re-queue the task with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, ProcessingQueue.retryCount), 30000);
      ProcessingQueue.retryCount++;
      setTimeout(() => ProcessingQueue.addTask(task), delay);
    }
  }
}

// Export a singleton instance
export default new ProcessingQueue();