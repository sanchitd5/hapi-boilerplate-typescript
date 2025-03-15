// Read .env file.
import './global';
import "dotenv/config";
import cluster, { Worker } from "node:cluster";
import { cpus } from "node:os";
import Config from "./config/index";
import { startMyServer } from "./server/server";
import SocketManager from './lib/socketManager';
import { ProcessQueueCleanupService } from './services/custom/processQueueCleanupService';

const numCpus: number = cpus().length;
const noOfClusters = Config.APP_CONFIG.maxNoOfClusters > numCpus ? numCpus : Config.APP_CONFIG.maxNoOfClusters;

export const workers: Worker[] = [];
let currentClusterIndex = 0;

let receivedSignal = false;


const shutdown = () => {
  if (receivedSignal) {
    return;
  }
  receivedSignal = true;
  console.info('Received shutdown signal');
  // Gracefully shutdown all workers
  console.info('Shutting down all workers...');
  for (const worker of workers) {
    try {
      if (!worker.isDead()) {
        worker.kill('SIGTERM');
      }
    } catch (err) {
      console.error(`Error shutting down worker ${worker.id}:`, err);
    }
  }

  // Run cleanup
  cleanup();

  // Force exit after timeout
  setTimeout(() => {
    console.info('Force stopping server');
    process.exit(0);
  }, 12000);
}

const stringifyAndMinimise = (obj: any) => {
  try {
    return JSON.stringify(obj, null, 0).substring(0, 10);
  } catch (e) {
    try {
      return String(obj).substring(0, 10);
    } catch (e) {
      return "Error in stringifyAndMinimise";
    }
  }
}

const setupWorkerListeners = (worker: Worker) => {
  worker.on("disconnect", () => {
    console.info(`Worker ${worker.process.pid} disconnected`);
    try {
      if (!worker.isDead()) {
        worker.kill('SIGTERM');
      }
    } catch (err) {
      console.error(`Error killing disconnected worker ${worker.id}:`, err);
    }
  });

  worker.on('unhandledRejection', (reason: any) => {
    console.error(`Worker ${worker.process.pid} unhandledRejection: ${stringifyAndMinimise(reason)}`);
  });

  worker.on("fatal", (err: Error) => {
    console.error(`Worker ${worker.process.pid} fatal: ${stringifyAndMinimise(err)}`);
    if (!receivedSignal) {
      destroyAndForkNewWorker(worker);
    }
  });

  worker.on("error", (err: Error) => {
    console.error(`Worker ${worker.process.pid} error: ${stringifyAndMinimise(err)}`);
  });

  worker.on("exit", (code: number, signal: string) => {
    console.info(`Worker ${worker.process.pid} exited with code ${code} and signal ${signal}`);

    if (receivedSignal) {
      return; // Don't respawn during shutdown
    }

    if (code !== 0 && !signal) { // Only respawn if crashed (non-zero exit) and not killed by signal
      console.info(`Worker ${worker.process.pid} crashed, restarting...`);
      destroyAndForkNewWorker(worker);
    }
  });
}

const destroyAndForkNewWorker = (worker: Worker) => {
  const _index = workers.findIndex((_worker) => _worker.id === worker.id);
  if (_index === -1) {
    console.error(`Worker ${worker.id} not found in workers array`);
    return;
  }

  // Stop the cleanup service before destroying the worker
  ProcessQueueCleanupService.stopCleanup().catch(err => {
    console.error('Error stopping cleanup service:', err);
  });

  try {
    // Ensure we kill the process if it's still running
    if (!worker.isDead()) {
      worker.kill('SIGTERM');
    }
    workers[_index].disconnect();
  } catch (err) {
    console.error(`Error killing worker ${worker.id}:`, err);
  }

  // Fork a new worker
  const _replacementWorker = cluster.fork();
  // Setup listeners for the new worker
  setupWorkerListeners(_replacementWorker);
  workers[_index] = _replacementWorker;
  return _replacementWorker;
}

const exec = async () => {


  await SocketManager.setupPrimaryServer()
}

// Add proper cleanup of resources on shutdown
const cleanup = () => {
  try {
    // Suggest garbage collection
    if (global.gc) {
      global.appLogger.info('Running garbage collection during shutdown');
      global.gc();
    }

    // Any other cleanup tasks can be added here
  } catch (err) {
    global.appLogger.error('Error during cleanup:', err);
  }
};

// Add cleanup to existing signal handlers
const shutdownHandler = (signal: string) => {
  if (receivedSignal) {
    return;
  }
  receivedSignal = true;
  console.info('Received shutdown signal');

  // Stop the cleanup service before general cleanup
  ProcessQueueCleanupService.stopCleanup().then(() => {
    // Run cleanup
    cleanup();

    setTimeout(() => {
      console.info('force stopping hapi server');
      process.exit(0);
    }, 12000);
    global.appLogger.info("gracefully stopping hapi server");

  }).catch(err => {
    console.error('Error stopping cleanup service during shutdown:', err);
    process.exit(1);
  });
}

const startTheServer = async () => {
  if (cluster.isPrimary) {
    process.on("unhandledRejection", (err) => {
      const stringifiedError = JSON.stringify(err);
      if (stringifiedError.includes('ECONNRESET') || // Ignore ECONNRESET errors on the primary process
        stringifiedError.includes('EPIPE') || // Ignore EPIPE errors on the primary process
        stringifiedError.includes(`typeof exports==='object'&&typeof module==='object'`) || // Ignore webpack errors
        stringifiedError.includes(`matFromImageData`) || // OpenCV error, ignore
        stringifiedError.includes(`cv.CV`) || // OpenCV error, ignore
        stringifiedError.includes('Node.js') || // Ignore Node.js errors
        stringifiedError.includes('@techstark/opencv-js/dist/opencv.js:30') // Ignore OpenCV.js specific error
      ) {
        return;
      }
      console.error(stringifyAndMinimise(err));
    });

    console.log(`Primary ${process.pid} is running`);
    for (let i = 0; i < noOfClusters; i++) {
      const worker = cluster.fork();
      setupWorkerListeners(worker);
      workers.push(worker);
    }

    await exec();

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
    process.on("end", shutdown);

    // Set up process monitoring interval
    const monitorInterval = setInterval(() => {
      if (receivedSignal) {
        clearInterval(monitorInterval);
        return;
      }

      // Check for and clean up any dead workers
      workers.forEach((worker, index) => {
        if (worker.isDead()) {
          console.info(`Found dead worker ${worker.id}, cleaning up`);
          workers[index].disconnect();
          workers[index] = cluster.fork();
          setupWorkerListeners(workers[index]);
        }
      });

      // Ensure we have the correct number of workers
      const activeWorkers = workers.filter(w => !w.isDead()).length;
      if (activeWorkers < noOfClusters) {
        console.info(`Worker count (${activeWorkers}) below configured clusters (${noOfClusters}), spawning new workers`);
        while (workers.filter(w => !w.isDead()).length < noOfClusters) {
          const worker = cluster.fork();
          setupWorkerListeners(worker);
          workers.push(worker);
        }
      }
    }, 30000); // Check every 30 seconds

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
    process.on("SIGHUP", shutdown);
    process.on("exit", () => {
      clearInterval(monitorInterval);
      cleanup();
    });

  } else {
    await startMyServer();
    // Try to start cleanup service in all workers, Redis lock ensures only one succeeds
    ProcessQueueCleanupService.startCleanupInterval();
  }
}

// Register the handler for various signals
process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
process.on('SIGINT', () => shutdownHandler('SIGINT'));
process.on('SIGHUP', () => shutdownHandler('SIGHUP'));

// Also register cleanup for normal exit
process.on('exit', cleanup);

startTheServer();
