import { EventEmitter } from 'events';
import ProcessingQueue from './processingQueue';
import NodeCacheManager from './NodeCacheManager';
import { getHeapStatistics } from 'v8';

class MemoryController extends EventEmitter {
    private static WARNING_THRESHOLD = 65;
    private static CRITICAL_THRESHOLD = 80;
    private static checkInterval = 3000;
    private static isInCriticalState = false;

    private warningThreshold: number;
    private criticalThreshold: number;
    private checkInterval: number;
    private highLoadInterval: number;
    private normalInterval: number;
    private intervalId?: NodeJS.Timeout;
    private isShuttingDown: boolean = false;
    private isUnderPressure: boolean = false;
    private maxHeapSize: number;

    constructor() {
        super();
        this.warningThreshold = 65;
        this.criticalThreshold = 80;
        this.normalInterval = 5000;
        this.highLoadInterval = 2000;
        this.checkInterval = this.normalInterval;
        this.maxHeapSize = getHeapStatistics().heap_size_limit;
    }

    start() {
        this.intervalId = setInterval(() => this.checkMemory(), this.checkInterval);
        return this;
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    private async forceCleanup() {
        if (global.gc) {
            global.gc();
            appLogger.info('Forced garbage collection');
        }

        // Clear module caches
        NodeCacheManager.closeAllCacheInstances();

        // Wait for GC to complete
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if memory improved
        const used = process.memoryUsage();
        const heapUsedPercent = ((used.heapUsed / this.maxHeapSize) * 100);

        if (heapUsedPercent > this.criticalThreshold) {
            appLogger.warn('Memory still critical after cleanup, extending cleanup time');
            if (global.gc) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                global.gc();
            }
        }
    }

    async prepareForShutdown() {
        this.isShuttingDown = true;
        this.stop();
        await this.forceCleanup();
        ProcessingQueue.clear();
    }

    private checkMemory() {
        if (this.isShuttingDown) return;

        const used = process.memoryUsage();
        const heapUsedPercent = ((used.heapUsed / this.maxHeapSize) * 100);

        const memoryStats = {
            rss: `${(used.rss / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`,
            heapUsed: `${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            maxHeap: `${(this.maxHeapSize / 1024 / 1024).toFixed(2)} MB`,
            external: `${(used.external / 1024 / 1024).toFixed(2)} MB`,
            heapUsedPercent: `${heapUsedPercent.toFixed(2)}%`,
            arrayBuffers: `${(used.arrayBuffers / 1024 / 1024).toFixed(2)} MB`
        };

        if (heapUsedPercent > this.criticalThreshold) {
            this.emit('critical', memoryStats);
            this.forceCleanup();

            if (!this.isUnderPressure) {
                this.isUnderPressure = true;
                // Switch to more frequent checks
                if (this.intervalId) {
                    clearInterval(this.intervalId);
                    this.checkInterval = this.highLoadInterval;
                    this.intervalId = setInterval(() => this.checkMemory(), this.checkInterval);
                }
            }
        } else if (heapUsedPercent > this.warningThreshold) {
            this.emit('warning', memoryStats);
            // Perform light cleanup at warning level
            if (global.gc) {
                global.gc();
            }
        } else {
            if (this.isUnderPressure) {
                this.isUnderPressure = false;
                // Switch back to normal check interval
                if (this.intervalId) {
                    clearInterval(this.intervalId);
                    this.checkInterval = this.normalInterval;
                    this.intervalId = setInterval(() => this.checkMemory(), this.checkInterval);
                }
            }
        }
    }

    static startMonitoring() {
        setInterval(() => {
            const used = process.memoryUsage();
            const maxHeapSize = getHeapStatistics().heap_size_limit;
            const heapUsedPercent = (used.heapUsed / maxHeapSize) * 100;

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
                if (global.gc) {
                    global.gc();
                }
            }

            // Critical threshold actions
            if (heapUsedPercent >= this.CRITICAL_THRESHOLD) {
                if (!this.isInCriticalState) {
                    this.isInCriticalState = true;
                    appLogger.error(`CRITICAL Memory Usage: ${JSON.stringify(stats)}`);
                    
                    // Force garbage collection
                    if (global.gc) {
                        global.gc();
                    }
                }
            } else {
                this.isInCriticalState = false;
            }

            // Regular memory stats logging
            appLogger.debug(`Memory Usage: ${JSON.stringify(stats)}`);
        }, this.checkInterval);
    }
}

export default new MemoryController();
