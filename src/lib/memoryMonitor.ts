/**
 * Memory Monitor utility for tracking memory usage and detecting potential memory leaks
 */
import { EventEmitter } from 'events';

export interface MemoryThresholds {
  warning: number; // percentage of total memory (0-100)
  critical: number; // percentage of total memory (0-100)
  interval: number; // check interval in ms
}

class MemoryMonitor extends EventEmitter {
  private isMonitoring: boolean = false;
  private interval: NodeJS.Timeout | null = null;
  private thresholds: MemoryThresholds = {
    warning: 70,
    critical: 85,
    interval: 60000, // 1 minute
  };

  private maxHeapSize: number;

  constructor() {
    super();
    // Get max heap size from v8
    this.maxHeapSize = require('v8').getHeapStatistics().heap_size_limit;
  }

  /**
   * Configure memory thresholds and monitoring interval
   */
  configure(options: Partial<MemoryThresholds>) {
    this.thresholds = { ...this.thresholds, ...options };
    return this;
  }

  /**
   * Start memory monitoring
   */
  start() {
    if (this.isMonitoring) return this;

    this.isMonitoring = true;
    this.checkMemory();
    
    this.interval = setInterval(() => {
      this.checkMemory();
    }, this.thresholds.interval);
    
    return this;
  }

  /**
   * Stop memory monitoring
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isMonitoring = false;
    return this;
  }

  /**
   * Check current memory usage
   */
  checkMemory() {
    try {
      const memoryUsage = process.memoryUsage();
      
      // Calculate heap usage as a percentage of max available heap
      const heapUsedPercent = (memoryUsage.heapUsed / this.maxHeapSize) * 100;
      
      const stats = {
        rss: this.formatBytes(memoryUsage.rss),
        heapTotal: this.formatBytes(memoryUsage.heapTotal),
        heapUsed: this.formatBytes(memoryUsage.heapUsed),
        maxHeap: this.formatBytes(this.maxHeapSize),
        external: this.formatBytes(memoryUsage.external),
        heapUsedPercent: heapUsedPercent.toFixed(2) + '%',
        arrayBuffers: this.formatBytes(memoryUsage.arrayBuffers || 0)
      };

      // Log memory stats at regular intervals
      if (global.appLogger) {
        global.appLogger.debug(`Memory Usage: ${JSON.stringify(stats)}`);
      }

      // Emit events based on thresholds
      if (heapUsedPercent > this.thresholds.critical) {
        this.emit('critical', stats);
        if (global.appLogger) {
          global.appLogger.error(`CRITICAL Memory Usage: ${JSON.stringify(stats)}`);
        }
        
        // Force garbage collection if node is run with --expose-gc flag
        if (global.gc) {
          global.gc();
          if (global.appLogger) {
            global.appLogger.info('Forced garbage collection');
          }
        }
      } else if (heapUsedPercent > this.thresholds.warning) {
        this.emit('warning', stats);
        if (global.appLogger) {
          global.appLogger.warn(`WARNING High Memory Usage: ${JSON.stringify(stats)}`);
        }
      } else {
        this.emit('normal', stats);
      }
      
      return stats;
    } catch (e) {
      if (global.appLogger) {
        global.appLogger.error(`Error checking memory: ${e}`);
      }
      return null;
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Singleton instance
export default new MemoryMonitor();