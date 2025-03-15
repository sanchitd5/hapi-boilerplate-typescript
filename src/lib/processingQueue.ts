/**
 * Processing Queue with Backpressure
 * Manages task execution with controlled concurrency to prevent memory overload.
 * This module implements an advanced task queue with the following features:
 * - Priority-based execution
 * - Automatic backpressure (slows down when system resources are strained)
 * - Retry mechanism for failed tasks
 * - Dynamic concurrency based on system load
 * - Memory usage monitoring
 */
import { EventEmitter } from 'events';
import MemoryMonitor from './memoryMonitor';
import os from 'os';

/**
 * Task options interface
 * @property {number} priority - Higher number means higher priority (default: 0)
 * @property {number} timeout - Maximum time in ms allowed for task execution
 * @property {number} retries - Number of times to retry on failure
 */
export interface TaskOptions {
  priority?: number; // Higher number = higher priority
  timeout?: number;  // Task timeout in ms
  retries?: number;  // Number of retries on failure
}

/**
 * Task interface representing a unit of work
 * @property {string} id - Unique identifier for the task
 * @property {Function} fn - Async function to execute
 * @property {any[]} args - Arguments to pass to the function
 * @property {TaskOptions} options - Configuration options for this task
 * @property {number} createdAt - Timestamp when the task was created
 */
export interface Task {
  id: string;
  fn: (...args: any[]) => Promise<any>;
  args: any[];
  options: TaskOptions;
  createdAt: number;
}

/**
 * ProcessingQueue class for managing asynchronous task execution
 * Extends EventEmitter to provide task status notifications
 * 
 * Events emitted:
 * - task:<id>:complete - When a task completes successfully
 * - task:<id>:error - When a task fails
 * - paused - When the queue is paused
 * - resumed - When the queue is resumed
 * - allPaused - When all tasks (including running ones) are paused
 */
class ProcessingQueue extends EventEmitter {
  private queue: Task[] = []; // Queue of pending tasks waiting to be processed
  private processing: Set<string> = new Set(); // Set of task IDs currently being processed
  private paused: boolean = false; // Flag indicating if queue processing is paused
  
  // Default configuration for queue behavior
  private config = {
    concurrency: Math.max(1, Math.floor(os.cpus().length / 2)), // Default to half of CPU cores
    memoryThreshold: 80, // Pause queue if memory usage exceeds this percentage
    priorityQueue: true, // Enable priority-based processing
    defaultTimeout: 60000, // Default timeout: 60 seconds
    defaultRetries: 3, // Default number of retries before failing permanently
  };

  // Static properties for global queue control
  private static maxConcurrency: number = 3; // Maximum tasks allowed to run in parallel
  private static minConcurrency: number = 1; // Minimum tasks to run even under heavy load
  private static currentConcurrency: number = ProcessingQueue.maxConcurrency; // Current concurrency limit
  private static isPaused: boolean = false; // Global pause flag
  private static resumeTimeout: NodeJS.Timeout | null = null; // Timer for auto-resume
  private static currentTasks: number = 0; // Number of tasks currently running
  private static retryCount: number = 0; // For exponential backoff in retries

  /**
   * Constructor initializes the queue and sets up memory monitoring
   */
  constructor() {
    super();
    this.setupMemoryMonitoring();
  }

  /**
   * Configure the processing queue with custom settings
   * @param {Partial<typeof this.config>} options - Configuration options to override defaults
   * @returns {ProcessingQueue} The instance for method chaining
   */
  configure(options: Partial<typeof this.config>) {
    this.config = { ...this.config, ...options };
    return this;
  }

  /**
   * Set up memory monitoring to implement backpressure
   * This reduces concurrency when memory usage is high to prevent out-of-memory errors
   * and increases concurrency when memory usage returns to normal
   */
  private setupMemoryMonitoring() {
    // When memory usage reaches warning level
    MemoryMonitor.on('warning', (stats) => {
      if (this.queue.length > 0 && this.config.concurrency > 1) {
        // Reduce concurrency temporarily when memory usage is high
        const oldConcurrency = this.config.concurrency;
        this.config.concurrency = Math.max(1, Math.floor(this.config.concurrency / 2));
        appLogger.warn(`Memory pressure: reducing concurrency from ${oldConcurrency} to ${this.config.concurrency}`);
      }
    });

    // When memory usage reaches critical level
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

    // When memory usage returns to normal
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
   * @param {string} id - Unique identifier for the task
   * @param {Function} fn - Async function to execute
   * @param {any[]} args - Arguments to pass to the function
   * @param {TaskOptions} options - Configuration options for this task
   * @returns {Promise<T>} Promise that resolves with the task result or rejects with an error
   */
  enqueue<T>(id: string, fn: (...args: any[]) => Promise<T>, args: any[] = [], options: TaskOptions = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      // Create task object with defaults applied
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

      // Add task to queue based on configuration
      if (this.config.priorityQueue) {
        // Insert based on priority (higher priority tasks go first)
        const index = this.queue.findIndex(t => t.options.priority! < task.options.priority!);
        if (index === -1) {
          this.queue.push(task);
        } else {
          this.queue.splice(index, 0, task);
        }
      } else {
        // Simple FIFO queue if priority not enabled
        this.queue.push(task);
      }

      // Set up event listeners for this task's completion or failure
      const onComplete = (result: T) => {
        this.removeTaskListeners(id, onComplete, onError);
        resolve(result);
      };

      const onError = (error: Error) => {
        this.removeTaskListeners(id, onComplete, onError);
        reject(error);
      };

      // Attach listeners
      this.on(`task:${id}:complete`, onComplete);
      this.on(`task:${id}:error`, onError);

      // Start processing the queue
      this.processQueue();
    });
  }

  /**
   * Helper method to remove event listeners for completed tasks
   * This prevents memory leaks from lingering listeners
   */
  private removeTaskListeners(id: string, onComplete: Function, onError: Function) {
    this.removeListener(`task:${id}:complete`, onComplete as any);
    this.removeListener(`task:${id}:error`, onError as any);
  }

  /**
   * Process tasks in the queue according to concurrency limit
   * This method processes as many tasks as allowed in parallel
   */
  private async processQueue() {
    // Don't process if queue is paused
    if (this.paused) return;

    // Process tasks until queue is empty or concurrency limit is reached
    while (this.queue.length > 0 && this.processing.size < this.config.concurrency) {
      const task = this.queue.shift();
      if (!task) continue;

      // Mark this task as being processed
      this.processing.add(task.id);
      
      // Create timeout controller to handle task timeouts
      const timeoutId = setTimeout(() => {
        this.emit(`task:${task.id}:error`, new Error(`Task ${task.id} timed out after ${task.options.timeout}ms`));
        this.processing.delete(task.id);
        this.processQueue();
      }, task.options.timeout);

      try {
        // Execute the task
        const result = await task.fn(...task.args);
        
        // Clear timeout since task completed
        clearTimeout(timeoutId);
        
        // Emit completion event with result
        this.emit(`task:${task.id}:complete`, result);
      } catch (error) {
        // Clear timeout
        clearTimeout(timeoutId);
        
        // Handle retries if configured
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
        // Always clean up by removing from processing set
        this.processing.delete(task.id);
      }
      
      // Process next task in queue
      this.processQueue();
    }
  }

  /**
   * Pause queue processing - new tasks won't start but current ones continue
   * @returns {ProcessingQueue} The instance for method chaining
   */
  pause() {
    this.paused = true;
    this.emit('paused');
    return this;
  }

  /**
   * Pause all queued and running tasks
   * @returns {ProcessingQueue} The instance for method chaining
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
   * Resume queue processing after a pause
   * @returns {ProcessingQueue} The instance for method chaining
   */
  resume() {
    this.paused = false;
    this.emit('resumed');
    this.processQueue();
    return this;
  }

  /**
   * Get queue status information
   * @returns {Object} Current queue stats (length, processing, state)
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
   * @returns {number} Number of tasks that were cleared
   */
  clear() {
    const count = this.queue.length;
    this.queue = [];
    appLogger.info(`Cleared ${count} tasks from queue`);
    return count;
  }

  /**
   * Static method to pause all processing globally
   * This reduces concurrency to minimum and sets a timeout to gradually restore it
   */
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
        
        // If memory usage is below 65%, safely increase concurrency
        if (heapUsedPercent < 65 && ProcessingQueue.currentConcurrency < ProcessingQueue.maxConcurrency) {
          ProcessingQueue.currentConcurrency++;
        } else {
          clearInterval(increaseInterval);
        }
      }, 5000); // Check every 5 seconds
    }, 10000); // Resume after 10 seconds
  }

  /**
   * Static method to add a task to the global processing queue
   * Uses backoff strategy if the system is under load
   * @param {Function} task - The task function to execute
   */
  static async addTask(task: any) {
    // Execute immediately if not paused and concurrency allows
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
        // Force garbage collection if available and all tasks are done
        if (global.gc && ProcessingQueue.currentTasks === 0) {
          global.gc();
        }
      }
    } else {
      // Re-queue the task with exponential backoff when system is busy
      const delay = Math.min(1000 * Math.pow(2, ProcessingQueue.retryCount), 30000);
      ProcessingQueue.retryCount++;
      setTimeout(() => ProcessingQueue.addTask(task), delay);
    }
  }
}

// Export a singleton instance for use across the application
export default new ProcessingQueue();