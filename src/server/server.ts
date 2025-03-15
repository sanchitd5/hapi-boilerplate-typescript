import Hapi from "@hapi/hapi";
import ServerHelper from "./helpers";
import cluster from "node:cluster";
import SocketManager from '../lib/socketManager';
import NodeCacheManager from "../lib/NodeCacheManager";
import MemoryMonitor from '../lib/memoryMonitor';
import MemoryController from '../lib/memoryController';

/**
 * @author Sanchit Dang
 * @description Initialize HAPI Server with all necessary configurations and plugins
 * @returns {Promise<Hapi.Server>} A started Hapi Server instance
 */
export const initServer = async (): Promise<Hapi.Server> => {
  // Ensure all required environment variables are available
  await ServerHelper.ensureEnvironmentFileExists();

  // Create Server instance with proper configurations
  const server = ServerHelper.createServer();

  // Register All Plugins (auth, logging, etc.)
  await ServerHelper.registerPlugins(server);

  // Add view templates for HTML rendering
  ServerHelper.addViews(server);

  // Set default route handling
  ServerHelper.setDefaultRoute(server);

  // Add routes to Swagger documentation for API reference
  ServerHelper.addSwaggerRoutes(server);

  // Bootstrap Application with initial data, connections, etc.
  ServerHelper.bootstrap();

  // Attach loggers to server events for monitoring
  ServerHelper.attachLoggerOnEvents(server);

  // Start Server and listen for connections
  await ServerHelper.startServer(server);

  return server;
};

/**
 * Gracefully shutdown the server and related resources
 * @param server - The Hapi server instance to stop
 * @returns {Promise<void>}
 */
export const shutdownGracefully = async (server?: Hapi.Server) => {
  let exitCode = 0;
  try {
    appLogger.info("Initiating graceful shutdown...");

    // Save any in-memory data and prepare memory controller for shutdown
    await MemoryController.prepareForShutdown();

    // Stop all scheduled cron jobs first
    ServerHelper.stopAllCrons();

    // Disconnect active socket connections if any exist
    if (SocketManager.isConnected()) {
      await SocketManager.disconnect();
    }

    // Close and clean up all cache instances
    NodeCacheManager.closeAllCacheInstances();

    // Stop the server if it's provided
    if (server) {
      // Remove event listeners to prevent memory leaks
      ServerHelper.disableListeners(server);
      // Give server 5 seconds to finish processing existing requests
      await server.stop({ timeout: 5000 });
    }

    // Clean up database connections and other resources
    await ServerHelper.cleanupResources();

    // Trigger final garbage collection if available
    if (global.gc) {
      global.gc();
    }

  } catch (error) {
    appLogger.error('Error during shutdown:', error);
    exitCode = 1; // Exit with error code
  } finally {
    process.exit(exitCode);
  }
};

/**
 * Initialize memory monitoring for the application
 * Sets up listeners for warning and critical memory usage conditions
 * @returns {MemoryMonitor} The configured memory monitor instance
 */
const initMemoryMonitoring = () => {
  // Configure and start memory monitoring with thresholds
  MemoryMonitor.configure({
    warning: 70,     // 70% heap usage triggers warning
    critical: 85,    // 85% heap usage triggers critical alert
    interval: 60000  // Check every minute (60000ms)
  }).start();

  // Set up listener for warning level memory usage
  MemoryMonitor.on('warning', (stats) => {
    // When memory usage reaches warning level, notify the master process if in cluster mode
    if (cluster.isWorker) {
      process.send?.({ type: 'memory-warning', workerId: cluster.worker?.id, stats });
    }
  });

  // Set up listener for critical level memory usage
  MemoryMonitor.on('critical', (stats) => {
    // When memory usage is critical, take more aggressive action
    if (cluster.isWorker) {
      // Notify master process about the critical condition
      process.send?.({ type: 'memory-critical', workerId: cluster.worker?.id, stats });

      // Force restart this worker if memory usage exceeds 95%
      if (parseFloat(stats.heapUsedPercent) > 95) {
        appLogger.warn('Worker memory usage critically high, restarting worker');
        setTimeout(() => process.exit(1), 1000); // Exit with error to trigger respawn
      }
    }
  });

  return MemoryMonitor;
};

/**
 * @author Sanchit Dang
 * @description Main entry point to start the HAPI Server with all necessary configurations
 * @returns {Promise<Hapi.Server>} The configured and running server instance
 */
export const startMyServer = async () => {
  try {
    console.info("Starting Server");
    
    // Connect to MongoDB database with worker ID for logging
    await ServerHelper.connectMongoDB(cluster.worker?.id ?? -1);
    
    // Set global variable for application root path
    ServerHelper.setGlobalAppRoot();
    
    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err) => {
      try {
        // Filter out common non-critical errors to reduce noise in logs
        const stringifiedError = JSON.stringify(err);
        if (stringifiedError.includes('ECONNRESET') || // Network connection reset
          stringifiedError.includes('EPIPE') || // Broken pipe error
          stringifiedError.includes(`typeof exports==='object'&&typeof module==='object'`) || // Webpack-related errors
          stringifiedError.includes(`matFromImageData`) || // OpenCV-related errors
          stringifiedError.includes(`cv.CV`) || // OpenCV API errors
          stringifiedError.includes('Node.js') || // General Node.js errors
          stringifiedError.includes('@techstark/opencv-js/dist/opencv.js:30') // Specific OpenCV.js error
        ) {
          return;
        }
      } catch (e) {
        // Ignore errors in the error handling itself
      }
      appLogger.fatal(err);
    });

    // Initialize the server with all configurations
    const server = await initServer();

    // Set up memory monitoring and management
    initMemoryMonitoring();

    // Connect WebSocket server if running in a worker process
    if (cluster.isWorker) {
      await SocketManager.connectSocket();
    }

    // Set up graceful shutdown on system signals
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    signals.forEach((signal) => {
      process.once(signal, async () => {
        appLogger.info(`Received ${signal}, starting graceful shutdown`);
        await shutdownGracefully(server);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      appLogger.error('Uncaught Exception:', error);
      await shutdownGracefully(server);
    });

    // Handle server close event for cleanup
    server.listener.on(
      "end",
      () => async () => await shutdownGracefully(server)
    );

    /**
     * Memory management for request handling
     * Monitors responses to large operations and triggers garbage collection
     * when necessary to prevent memory leaks
     */
    server.events.on('response', (request) => {
      // Only trigger garbage collection for potentially memory-intensive operations
      // identified by their API endpoint path
      if (request.url.pathname.includes('/api/large_operation/')) {
        // Delay garbage collection to allow event loop to clear
        if (global.gc) {
          setTimeout(() => {
            global.gc?.(); // Trigger manual garbage collection
            appLogger.debug('GC triggered after memory-intensive operation');
          }, 1000); // Wait 1 second after request completes
        }
      }
    });

    return server;
  } catch (e) {
    // Log server startup errors and exit
    appLogger.error('Error starting server', e);
    process.exit(1); // Exit with error code
  }
};
