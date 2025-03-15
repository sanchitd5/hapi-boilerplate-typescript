import ProcessQueue from '../models/mongo/processQueue';
import PM2Manager from '../../lib/pm2Manager';
import { Logger } from 'log4js';
import Services from '..';
import mongoose from 'mongoose';
import RedisManager from '../../lib/redisManager';

declare global {
    var appLogger: Logger;
    var mongoLogger: Logger;
}

export class ProcessQueueCleanupService {
    private static readonly STALE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
    private static readonly LOCK_KEY = 'process_queue_cleanup_lock';
    private static readonly LOCK_TTL = 60; // 60 seconds TTL for the lock
    private static cleanupInterval: NodeJS.Timeout | null = null;

    static async cleanupStaleProcesses(): Promise<void> {
        try {
            const now = new Date();
            const staleThreshold = new Date(now.getTime() - this.STALE_TIMEOUT);

            // Get list of active PM2 processes
            const activeProcesses = await PM2Manager.list();
            const activeWorkerIds = activeProcesses.map(proc => proc.id.toString());

            // Find and update stale processes
            const result = await ProcessQueue.updateMany(
                {
                    $or: [
                        // Condition 1: Process is older than 5 minutes and not completed
                        {
                            timestamp: { $lt: staleThreshold },
                            completed: false,
                            errored: false
                        },
                        // Condition 2: Worker no longer exists
                        {
                            workerId: { $nin: activeWorkerIds },
                            completed: false,
                            errored: false
                        }
                    ]
                },
                {
                    $set: {
                        errored: true,
                        error: 'Process timed out or worker died'
                    }
                }
            );

            if (result.modifiedCount > 0) {
                global.appLogger.info(`Marked ${result.modifiedCount} stale processes as errored`);
            }
        } catch (error) {
            global.appLogger.error('Error cleaning up stale processes:', error);
        }
    }

    static async startCleanupInterval(intervalMs: number = 60000): Promise<void> {
        if (this.cleanupInterval) {
            return; // Already running
        }

        // Try to acquire initial lock
        const acquired = await this.acquireLock();
        if (!acquired) {
            global.mongoLogger.debug('Another worker is already handling cleanup');
            return;
        }

        await ProcessQueue.deleteMany(); // Clear all existing processes

        try {
            // Ensure MongoDB connection
            if (mongoose.connection.readyState !== 1) {
                global.mongoLogger.error('Cannot start ProcessQueueCleanupService: No MongoDB connection');
                return;
            }

            // Initial cleanup
            await this.cleanup();

            // Schedule periodic cleanup with lock checking
            this.cleanupInterval = setInterval(async () => {
                try {
                    // Check if we still have the lock
                    const hasLock = await this.acquireLock();
                    if (!hasLock) {
                        global.mongoLogger.debug('Lost cleanup lock to another worker');
                        return;
                    }

                    await this.cleanup();
                } catch (error) {
                    global.mongoLogger.error('Error in ProcessQueueCleanupService interval:', error);
                }
            }, 3600000); // Run every hour

            global.mongoLogger.info('ProcessQueueCleanupService started successfully');
        } catch (error) {
            global.mongoLogger.error('Error starting ProcessQueueCleanupService:', error);
            await this.releaseLock();
        }
    }

    private static async cleanup() {
        if (mongoose.connection.readyState !== 1) {
            return;
        }

        try {
            await Services.ProcessQueueService.empty();
            global.mongoLogger.info('ProcessQueue cleanup completed successfully');
        } catch (error) {
            global.mongoLogger.error('ProcessQueue cleanup failed:', error);
            throw error;
        }
    }

    private static async acquireLock(): Promise<boolean> {
        try {
            // Use SET with NX and EX options according to ioredis API
            const result = await RedisManager.client().set(
                this.LOCK_KEY,
                process.pid.toString(),
                'EX',
                this.LOCK_TTL,
                'NX'
            );
            return result === 'OK';
        } catch (error) {
            global.mongoLogger.error('Error acquiring cleanup lock:', error);
            return false;
        }
    }

    private static async releaseLock(): Promise<void> {
        try {
            // Only release if we own the lock
            const currentHolder = await RedisManager.get(this.LOCK_KEY);
            if (currentHolder === process.pid.toString()) {
                await RedisManager.client().del(this.LOCK_KEY);
            }
        } catch (error) {
            global.mongoLogger.error('Error releasing cleanup lock:', error);
        }
    }

    static async stopCleanup(): Promise<void> {
        if (this.cleanupInterval !== null) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        await this.releaseLock();
    }
}