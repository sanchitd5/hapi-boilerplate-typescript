/**
 * Memory Monitor Utility
 * 
 * A comprehensive tool for tracking Node.js application memory usage and preventing memory leaks.
 * This module provides real-time monitoring with event-based notifications for different
 * memory usage thresholds, enabling applications to take appropriate actions when memory
 * pressure occurs.
 * 
 * Features:
 * - Configurable warning and critical thresholds
 * - Customizable monitoring intervals
 * - Event-driven architecture for reacting to memory state changes
 * - Automatic garbage collection at high memory usage (when --expose-gc flag is used)
 * - Human-readable memory usage statistics
 */
import { EventEmitter } from 'events';

/**
 * Configuration options for memory monitoring thresholds and intervals
 * @interface MemoryThresholds
 * @property {number} warning - Percentage of total memory (0-100) that triggers warning events
 * @property {number} critical - Percentage of total memory (0-100) that triggers critical events
 * @property {number} interval - Monitoring check interval in milliseconds
 */
export interface MemoryThresholds {
  warning: number; // percentage of total memory (0-100)
  critical: number; // percentage of total memory (0-100)
  interval: number; // check interval in ms
}

/**
 * MemoryMonitor class extends EventEmitter to provide memory-related events
 * 
 * Events emitted:
 * - 'normal' - When memory usage is below warning threshold
 * - 'warning' - When memory usage exceeds warning threshold
 * - 'critical' - When memory usage exceeds critical threshold
 * 
 * Each event provides detailed memory statistics to event handlers
 */
class MemoryMonitor extends EventEmitter {
  private isMonitoring: boolean = false;  // Flag to track if monitoring is active
  private interval: NodeJS.Timeout | null = null;  // Timer reference for monitoring interval
  
  // Default thresholds for memory monitoring
  private thresholds: MemoryThresholds = {
    warning: 70,     // 70% heap usage triggers warning
    critical: 85,    // 85% heap usage triggers critical alert
    interval: 60000, // Check every minute (60000ms)
  };

  // Maximum heap size available to the Node.js process
  private maxHeapSize: number;

  /**
   * Initialize the memory monitor with V8 heap statistics
   * The max heap size is determined from V8 engine settings
   */
  constructor() {
    super();
    // Get max heap size from V8 - this is the upper limit for heap memory allocation
    this.maxHeapSize = require('v8').getHeapStatistics().heap_size_limit;
  }

  /**
   * Configure memory thresholds and monitoring interval
   * @param {Partial<MemoryThresholds>} options - Custom thresholds and interval
   * @returns {MemoryMonitor} Returns this instance for method chaining
   */
  configure(options: Partial<MemoryThresholds>) {
    // Merge custom options with defaults
    this.thresholds = { ...this.thresholds, ...options };
    return this;
  }

  /**
   * Start memory monitoring with periodic checks
   * Will check memory usage at intervals specified in configuration
   * @returns {MemoryMonitor} Returns this instance for method chaining
   */
  start() {
    // Prevent starting multiple monitoring intervals
    if (this.isMonitoring) return this;

    // Set monitoring flag and perform initial check
    this.isMonitoring = true;
    this.checkMemory();
    
    // Schedule regular memory checks
    this.interval = setInterval(() => {
      this.checkMemory();
    }, this.thresholds.interval);
    
    return this;
  }

  /**
   * Stop memory monitoring by clearing the interval
   * @returns {MemoryMonitor} Returns this instance for method chaining
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
   * Check current memory usage and emit appropriate events
   * This is the core monitoring function that analyzes memory usage
   * and triggers events based on the configured thresholds.
   * 
   * @returns {Object|null} Memory statistics or null if an error occurs
   */
  checkMemory() {
    try {
      // Get detailed memory usage from Node.js process
      const memoryUsage = process.memoryUsage();
      
      // Calculate heap usage as a percentage of max available heap
      const heapUsedPercent = (memoryUsage.heapUsed / this.maxHeapSize) * 100;
      
      // Format memory statistics for human readability
      const stats = {
        rss: this.formatBytes(memoryUsage.rss),               // Resident Set Size (total allocated memory)
        heapTotal: this.formatBytes(memoryUsage.heapTotal),   // V8 heap memory allocation
        heapUsed: this.formatBytes(memoryUsage.heapUsed),     // Currently used heap memory
        maxHeap: this.formatBytes(this.maxHeapSize),          // Maximum available heap memory
        external: this.formatBytes(memoryUsage.external),     // Memory used by C++ objects bound to JS
        heapUsedPercent: heapUsedPercent.toFixed(2) + '%',    // Percentage of max heap used
        arrayBuffers: this.formatBytes(memoryUsage.arrayBuffers || 0) // ArrayBuffer allocations
      };

      // Log memory stats at regular intervals for monitoring
      if (global.appLogger) {
        global.appLogger.debug(`Memory Usage: ${JSON.stringify(stats)}`);
      }

      // Emit events based on memory usage thresholds
      if (heapUsedPercent > this.thresholds.critical) {
        // Critical memory pressure - emit event and take immediate action
        this.emit('critical', stats);
        if (global.appLogger) {
          global.appLogger.error(`CRITICAL Memory Usage: ${JSON.stringify(stats)}`);
        }
        
        // Force garbage collection if node is run with --expose-gc flag
        // This can help prevent out-of-memory crashes
        if (global.gc) {
          global.gc();
          if (global.appLogger) {
            global.appLogger.info('Forced garbage collection');
          }
        }
      } else if (heapUsedPercent > this.thresholds.warning) {
        // Warning level memory pressure - emit event for optional actions
        this.emit('warning', stats);
        if (global.appLogger) {
          global.appLogger.warn(`WARNING High Memory Usage: ${JSON.stringify(stats)}`);
        }
      } else {
        // Normal memory usage - emit normal event
        this.emit('normal', stats);
      }
      
      return stats;
    } catch (e) {
      // Handle any errors during memory checking
      if (global.appLogger) {
        global.appLogger.error(`Error checking memory: ${e}`);
      }
      return null;
    }
  }

  /**
   * Format bytes to human readable string with appropriate units
   * Converts raw byte values to KB, MB, GB, or TB for better readability
   * 
   * @param {number} bytes - The raw byte value to format
   * @returns {string} Formatted string with appropriate unit suffix
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export a singleton instance for application-wide memory monitoring
export default new MemoryMonitor();