import Hapi from "@hapi/hapi";
import ServerHelper from "./helpers";
import cluster from "node:cluster";
import SocketManager from '../lib/socketManager';
import NodeCacheManager from "../lib/NodeCacheManager";
import MemoryMonitor from '../lib/memoryMonitor';
import MemoryController from '../lib/memoryController';
/**
 * @author Sanchit Dang
 * @description Initilize HAPI Server
 * @returns {Hapi.Server} A Started Hapi Server
 */
const initServer = async (): Promise<Hapi.Server> => {

  await ServerHelper.ensureEnvironmentFileExists();

  //Create Server
  const server = ServerHelper.createServer();

  //Register All Plugins
  await ServerHelper.registerPlugins(server);

  //add views
  ServerHelper.addViews(server);

  //Default Routes
  ServerHelper.setDefaultRoute(server);

  // Add routes to Swagger documentation
  ServerHelper.addSwaggerRoutes(server);

  // Bootstrap Application
  ServerHelper.bootstrap();

  ServerHelper.attachLoggerOnEvents(server);

  // Start Server
  await ServerHelper.startServer(server);

  return server;
};

const shutdownGracefully = async (server?: Hapi.Server) => {
  let exitCode = 0;
  try {
    appLogger.info("Initiating graceful shutdown...");

    // Prepare memory controller for shutdown
    await MemoryController.prepareForShutdown();

    // Stop all cron jobs first
    ServerHelper.stopAllCrons();

    // Disconnect socket connections if any
    if (SocketManager.isConnected()) {
      await SocketManager.disconnect();
    }

    // Close cache instances
    NodeCacheManager.closeAllCacheInstances();

    if (server) {
      ServerHelper.disableListeners(server);
      await server.stop({ timeout: 5000 });
    }

    // Clean up resources
    await ServerHelper.cleanupResources();

    // Final garbage collection
    if (global.gc) {
      global.gc();
    }

  } catch (error) {
    appLogger.error('Error during shutdown:', error);
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
};

// Add this function to initialize memory monitoring
const initMemoryMonitoring = () => {
  // Configure and start memory monitoring
  MemoryMonitor.configure({
    warning: 70,     // 70% heap usage triggers warning
    critical: 85,    // 85% heap usage triggers critical alert
    interval: 60000  // Check every minute
  }).start();

  // Set up listeners
  MemoryMonitor.on('warning', (stats) => {
    // Additional actions could be taken here when memory usage is high
    if (cluster.isWorker) {
      process.send?.({ type: 'memory-warning', workerId: cluster.worker?.id, stats });
    }
  });

  MemoryMonitor.on('critical', (stats) => {
    // Consider implementing emergency measures for critical memory situations
    if (cluster.isWorker) {
      process.send?.({ type: 'memory-critical', workerId: cluster.worker?.id, stats });

      // Optional: Force restart this worker if memory usage is extremely high
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
 * @description Start HAPI Server
 */
export const startMyServer = async () => {
  try {
    console.info("Starting Server");
    await ServerHelper.connectMongoDB(cluster.worker?.id ?? -1);
    // Global variable to get app root folder path
    ServerHelper.setGlobalAppRoot();
    process.on("unhandledRejection", (err) => {
      try {
        const stringifiedError = JSON.stringify(err);
        if (stringifiedError.includes('ECONNRESET') || // Ignore ECONNRESET 
          stringifiedError.includes('EPIPE') || // Ignore EPIPE errors  
          stringifiedError.includes(`typeof exports==='object'&&typeof module==='object'`) || // Ignore webpack errors
          stringifiedError.includes(`matFromImageData`) || // OpenCV error, ignore
          stringifiedError.includes(`cv.CV`) || // OpenCV error, ignore 
          stringifiedError.includes('Node.js') || // Ignore Node.js errors
          stringifiedError.includes('@techstark/opencv-js/dist/opencv.js:30') // Ignore OpenCV.js specific error
        ) {
          return;
        }
      } catch (e) {
        // Ignore
      }
      appLogger.fatal(err);
    });

    const server = await initServer();

    // Initialize memory monitoring
    initMemoryMonitoring();

    if (cluster.isWorker) {
      await SocketManager.connectSocket();
    }

    // Improve signal handling
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    signals.forEach((signal) => {
      process.once(signal, async () => {
        appLogger.info(`Received ${signal}, starting graceful shutdown`);
        await shutdownGracefully(server);
      });
    });

    // Handle uncaughtException
    process.on('uncaughtException', async (error) => {
      appLogger.error('Uncaught Exception:', error);
      await shutdownGracefully(server);
    });


    server.listener.on(
      "end",
      () => async () => await shutdownGracefully(server)
    );

    // Add memory cleanup on request completion for large operations
    server.events.on('response', (request) => {
      // Only run for potentially memory-intensive operations
      if (request.url.pathname.includes('/api/large_operation/')) {
        // Suggest garbage collection after memory-intensive operations
        if (global.gc) {
          setTimeout(() => {
            global.gc?.();
            appLogger.debug('GC triggered after memory-intensive operation');
          }, 1000);
        }
      }
    });

    return server;
  } catch (e) {
    appLogger.error('Error starting server', e);
    process.exit(1);
  }
};
