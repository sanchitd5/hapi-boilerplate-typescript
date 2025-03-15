/**
 * MemoryController - Advanced memory management system for Node.js applications
 * 
 * This class provides a comprehensive memory monitoring and management solution with features:
 * - Real-time memory usage monitoring
 * - Automatic garbage collection triggering at configurable thresholds
 * - Event-based notification system for memory pressure events
 * - Graceful shutdown preparation to prevent memory leaks
 * - Adaptive monitoring intervals based on memory pressure
 */
import { EventEmitter } from 'events';
import ProcessingQueue from './processingQueue';
import NodeCacheManager from './NodeCacheManager';
import { getHeapStatistics } from 'v8';

/**
 * MemoryController extends EventEmitter to provide memory-related events
 * Events emitted:
 * - 'warning': When memory usage crosses warning threshold
 * - 'critical': When memory usage crosses critical threshold
 * - 'recovered': When memory usage returns to normal after being in warning/critical state
 */
class MemoryController extends EventEmitter {
    // Static thresholds for class-level monitoring (used by static methods)
    private static WARNING_THRESHOLD = 65;  // 65% heap usage triggers warning actions
    private static CRITICAL_THRESHOLD = 80; // 80% heap usage triggers critical actions
    private static checkInterval = 3000;    // Check memory every 3 seconds
    private static isInCriticalState = false; // Tracks if we're currently in critical state

    // Instance properties for object-level monitoring
    private warningThreshold: number;       // % of heap that triggers warning
    private criticalThreshold: number;      // % of heap that triggers critical action
    private checkInterval: number;          // Current check interval (ms)
    private highLoadInterval: number;       // Faster check interval during high memory usage (ms)
    private normalInterval: number;         // Normal check interval during regular operation (ms)
    private intervalId?: NodeJS.Timeout;    // Timer ID for memory checks
    private isShuttingDown: boolean = false; // Flag to prevent actions during shutdown
    private isUnderPressure: boolean = false; // Tracks if currently under memory pressure
    private maxHeapSize: number;            // Maximum available heap memory from V8

    /**
     * Initialize the memory controller with default thresholds and intervals
     */
    constructor() {
        super();
        // Default thresholds
        this.warningThreshold = 65;     // 65% heap usage
        this.criticalThreshold = 80;    // 80% heap usage
        this.normalInterval = 5000;     // Check every 5 seconds normally
        this.highLoadInterval = 2000;   // Check every 2 seconds under high load
        this.checkInterval = this.normalInterval;
        // Get the maximum heap size from V8
        this.maxHeapSize = getHeapStatistics().heap_size_limit;
    }

    /**
     * Start memory monitoring with periodic checks
     * @returns {MemoryController} Returns this instance for method chaining
     */
    start() {
        this.intervalId = setInterval(() => this.checkMemory(), this.checkInterval);
        return this;
    }

    /**
     * Stop memory monitoring by clearing the interval
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    /**
     * Force memory cleanup operations including garbage collection
     * Used to recover from high memory usage situations
     * @returns {Promise<void>} Promise that resolves when cleanup is complete
     */
    private async forceCleanup() {
        // Run garbage collection if the --expose-gc flag is set
        if (global.gc) {
            global.gc();
            appLogger.info('Forced garbage collection');
        }

        // Clear module caches to free up memory
        NodeCacheManager.closeAllCacheInstances();

        // Wait for GC to complete its work
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if memory improved after initial cleanup
        const used = process.memoryUsage();
        const heapUsedPercent = ((used.heapUsed / this.maxHeapSize) * 100);

        // If still critical, try more aggressive cleanup
        if (heapUsedPercent > this.criticalThreshold) {
            appLogger.warn('Memory still critical after cleanup, extending cleanup time');
            if (global.gc) {
                // Wait longer and try GC again
                await new Promise(resolve => setTimeout(resolve, 2000));
                global.gc();
            }
        }
    }

    /**
     * Prepare for application shutdown by cleaning up memory
     * Called before server shutdown to ensure clean exit
     * @returns {Promise<void>} Promise that resolves when preparation is complete
     */
    async prepareForShutdown() {
        this.isShuttingDown = true;
        this.stop();
        // Clean up memory before exiting
        await this.forceCleanup();
        // Clear any pending tasks in the processing queue
        ProcessingQueue.clear();
    }

    /**
     * Check current memory usage and take appropriate actions
     * This is the core monitoring function that runs periodically
     */
    private checkMemory() {
        // Skip checks if we're shutting down
        if (this.isShuttingDown) return;

        // Get current memory usage from Node.js
        const used = process.memoryUsage();
        // Calculate percentage of maximum heap used
        const heapUsedPercent = ((used.heapUsed / this.maxHeapSize) * 100);

        // Format memory stats for logging and events
        const memoryStats = {
            rss: `${(used.rss / 1024 / 1024).toFixed(2)} MB`,           // Resident Set Size - total memory allocated
            heapTotal: `${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`, // Total size of allocated heap
            heapUsed: `${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`,   // Actually used heap
            maxHeap: `${(this.maxHeapSize / 1024 / 1024).toFixed(2)} MB`,  // Maximum available heap
            external: `${(used.external / 1024 / 1024).toFixed(2)} MB`,   // Memory used by C++ objects bound to JS
            heapUsedPercent: `${heapUsedPercent.toFixed(2)}%`,           // Percentage of max heap used
            arrayBuffers: `${(used.arrayBuffers / 1024 / 1024).toFixed(2)} MB` // Size of all ArrayBuffers
        };

        // Critical threshold actions - memory is dangerously high
        if (heapUsedPercent > this.criticalThreshold) {
            // Emit critical event with memory stats
            this.emit('critical', memoryStats);
            // Force immediate cleanup to prevent crash
            this.forceCleanup();

            // Switch to more frequent monitoring if not already doing so
            if (!this.isUnderPressure) {
                this.isUnderPressure = true;
                // Increase check frequency during high memory usage
                if (this.intervalId) {
                    clearInterval(this.intervalId);
                    this.checkInterval = this.highLoadInterval;
                    this.intervalId = setInterval(() => this.checkMemory(), this.checkInterval);
                }
            }
        } 
        // Warning threshold actions - memory is getting high
        else if (heapUsedPercent > this.warningThreshold) {
            // Emit warning event with memory stats
            this.emit('warning', memoryStats);
            // Perform light cleanup at warning level
            if (global.gc) {
                global.gc();
            }
        } 
        // Memory returned to normal levels
        else {
            // If previously under pressure, switch back to normal checking interval
            if (this.isUnderPressure) {
                this.isUnderPressure = false;
                // Decrease check frequency when memory returns to normal
                if (this.intervalId) {
                    clearInterval(this.intervalId);
                    this.checkInterval = this.normalInterval;
                    this.intervalId = setInterval(() => this.checkMemory(), this.checkInterval);
                }
            }
        }
    }

    /**
     * Static method to start memory monitoring across the application
     * This provides a simpler interface than the instance-based monitoring
     */
    static startMonitoring() {
        setInterval(() => {
            // Get current memory usage
            const used = process.memoryUsage();
            const maxHeapSize = getHeapStatistics().heap_size_limit;
            const heapUsedPercent = (used.heapUsed / maxHeapSize) * 100;

            // Format memory stats for logging
            const stats = {
                rss: `${(used.rss / 1024 / 1024).toFixed(2)} MB`,
                heapTotal: `${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                heapUsed: `${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                maxHeap: `${(maxHeapSize / 1024 / 1024).toFixed(2)} MB`,
                external: `${(used.external / 1024 / 1024).toFixed(2)} MB`,
                heapUsedPercent: `${heapUsedPercent.toFixed(2)}%`,
                arrayBuffers: `${(used.arrayBuffers / 1024 / 1024).toFixed(2)} MB`
            };

            // Intermediate cleanup at warning threshold
            if (heapUsedPercent >= this.WARNING_THRESHOLD) {
                appLogger.warn(`High Memory Usage: ${JSON.stringify(stats)}`);
                // Trigger garbage collection if available
                if (global.gc) {
                    global.gc();
                }
            }

            // Critical threshold actions
            if (heapUsedPercent >= this.CRITICAL_THRESHOLD) {
                // Only log once when entering critical state to avoid log spam
                if (!this.isInCriticalState) {
                    this.isInCriticalState = true;
                    appLogger.error(`CRITICAL Memory Usage: ${JSON.stringify(stats)}`);
                    
                    // Force garbage collection to free memory
                    if (global.gc) {
                        global.gc();
                    }
                }
            } else {
                // Reset critical state flag when memory returns below threshold
                this.isInCriticalState = false;
            }

            // Regular memory stats logging for monitoring trends
            appLogger.debug(`Memory Usage: ${JSON.stringify(stats)}`);
        }, this.checkInterval);
    }
}

// Export a singleton instance for application-wide use
export default new MemoryController();
