import Hapi from "@hapi/hapi";
import Joi from "joi";
import log4js from "log4js";
import SwaggerPlugins from "./plugins";
import * as handlebars from "handlebars";
import mongoose from "mongoose";
import CONFIG from "../config/index";
import Path from "path";
import Routes from "../routes";
import fs from "fs-extra";
import CronManager from "../lib/cronManager";
import Spawner from "../lib/spawner";
import { ChildProcess } from "child_process";
import { delay } from "../utils";
import { Sequelize } from "sequelize";

let loggersConfigured = false;

/**
 * @description Helper file for the server
 */
class ServerHelper {
  declare sequilizeInstance: Sequelize;
  private declare spawner: Spawner;
  private declare octoprintProcess: ChildProcess;
  private declare motionProcess: ChildProcess;
  constructor(pid: number) {
    this.configureLog4js(pid);
    this.spawner = new Spawner({
      detached: true,
      stdio: "inherit",
    });

  }

  setGlobalAppRoot() {
    global.appRoot = Path.resolve(__dirname);
  }

  bootstrap() {
    return;
  }

  /**
   *
   * @param {Hapi.Server} server
   */
  addSwaggerRoutes(server: Hapi.Server) {
    appLogger.debug("Adding Swagger Routes");

    // Add static route for Swagger UI assets
    server.route({
      method: 'GET',
      path: '/swaggerui/{param*}',
      handler: {
        directory: {
          path: Path.join(require.resolve('hapi-swagger'), '../../static'),
          listing: false,
          index: false
        }
      }
    });

    server.route(Routes);
  }

  /**
   *
   * @param {Hapi.Server} server
   */
  attachLoggerOnEvents(server: Hapi.Server) {
    appLogger.debug("Attaching Logger on Events");
    server.events.on("response", (request: any) => {
      if (request.url.pathname.includes('swagger') || request.url.pathname.includes('fav') || request.url.pathname === '') {
        // ignore swagger, empty and favicon requests
        return;
      }
      appLogger.debug(
        `${request.info.remoteAddress}->(${request.url.pathname
        })[${request.method.toUpperCase()}] ${request.response.statusCode}`
      );
      if (request.payload) {
        if (request.payload.password) {
          request.payload.password = "********";
        }
        Object.keys(request.payload).forEach((key) => {
          if (request.payload[key]?._readableState) {
            request.payload[key] = "****Buffer_Image****";
          }
        })
        appLogger.debug("Request payload:", request.payload);
      }
    });
  }

  /**
   * @returns {Hapi.Server} A Hapi Server
   */
  createServer(): Hapi.Server {
    appLogger.debug("Creating HAPI Server");
    const server = new Hapi.Server({
      app: {
        name: process.env.APP_NAME || "default",
      },
      port: process.env.HAPI_PORT || 8000,
      routes: { cors: true },
    });
    server.validator(Joi);
    return server;
  }

  /**
   * @author Sanchit Dang
   * @description Adds Views to the server
   * @param {Hapi.Server} server
   */
  addViews(server: Hapi.Server) {
    appLogger.debug("Adding Views to the server");
    (server as any).views({
      engines: {
        html: handlebars,
      },
      relativeTo: __dirname,
      path: "../../views",
    });
  }

  /**
   * @author Sanchit Dang
   * @description sets default route for the server
   * @param {Hapi.Server} server HAPI Server
   * @param {String} defaultRoute Optional - default route
   */
  setDefaultRoute(server: Hapi.Server, defaultRoute?: string) {
    appLogger.debug("Setting default route for the server");
    if (defaultRoute === undefined) defaultRoute = "/";
    server.route({
      method: "GET",
      path: defaultRoute,
      handler: (req, res) => {
        return (res as any).view("welcome");
      },
    });
  }

  /**
   *
   * @param {Hapi.Server} server HAPI Server
   */
  async registerPlugins(server: Hapi.Server) {
    try {
      appLogger.debug("Registering Plugins on HAPI Server");
      await (server as any).register(SwaggerPlugins);
      server.log(["info"], "Plugins Loaded");
    } catch (e) {
      server.log(["error"], "Error while loading plugins : " + e);
    }
  }

  configureLog4js = (pid: number) => {
    if (loggersConfigured) return;
    loggersConfigured = true;
    const defaultLogLevel = process.env.NODE_ENV === 'DEVELOPMENT' ? log4js.levels.DEBUG : log4js.levels.INFO;
    const loggers = ['App', 'Upload_Manager', 'Socket_Manager', 'Token_Manager',
      'Mongo_Manager',];
    const appenders = {};
    const categories = {};

    // Configure appenders for each logger with both console and file output
    loggers.forEach((logger) => {
      const name = "PID_" + pid.toString() + "_" + logger;
      const fileAppenderName = `${name}_file`;

      // Console appender
      Object.assign(appenders, {
        [name]: { type: 'console' },
        // File appender
        [fileAppenderName]: {
          type: 'dateFile',
          filename: `logs/${logger.toLowerCase()}.log`,
          pattern: '.yyyy-MM-dd',
          compress: true,
          keepFileExt: true,
          numBackups: 7,
          layout: {
            type: 'pattern',
            pattern: '[%d] [%p] %c - %m'
          }
        }
      });

      // Configure category to use both console and file appenders
      Object.assign(categories, {
        [logger]: {
          appenders: [name, fileAppenderName],
          level: "trace",
          enableCallStack: true
        }
      });
    });

    // Configure log4js with both appenders
    log4js.configure({
      appenders: appenders,
      categories: {
        default: {
          appenders: [`PID_${pid}_App`, `PID_${pid}_App_file`],
          level: "trace",
          enableCallStack: true
        },
        ...categories
      },
      disableClustering: true, // Disable clustering to prevent mutex issues
    });

    // Set up global loggers
    global.appLogger = log4js.getLogger(`PID_${pid}_App`);
    global.appLogger.level = defaultLogLevel;
    global.uploadLogger = log4js.getLogger("Upload_Manager");
    global.socketLogger = log4js.getLogger("Socket_Manager");
    global.tokenLogger = log4js.getLogger("Token_Manager");
    global.mongoLogger = log4js.getLogger("Mongo_Manager");

    // Overwrite console while retaining original functionality
    let _originalConsole: any = global.console;
    _originalConsole = {
      ..._originalConsole,
      ...global.appLogger,
      error: (...args: any[]) => {
        global.appLogger.error(args[0], ...args.slice(1));
      },
      warn: (...args: any[]) => {
        global.appLogger.warn(args[0], ...args.slice(1));
      },
      info: (...args: any[]) => {
        global.appLogger.info(args[0], ...args.slice(1));
      },
      debug: (...args: any[]) => {
        global.appLogger.debug(args[0], ...args.slice(1));
      },
      trace: (...args: any[]) => {
        global.appLogger.trace(args[0], ...args.slice(1));
      }
    }
    global.console = _originalConsole;

    // Add shutdown hook for log4js
    process.on('beforeExit', () => {
      this.shutdownLog4Js();
    });
  };

  shutdownLog4Js() {
    return new Promise<void>((resolve) => {
      try {
        // Flush any remaining logs
        Object.values(log4js.getLogger()).forEach((logger: any) => {
          if (logger && typeof logger.shutdown === 'function') {
            logger.shutdown();
          }
        });

        log4js.shutdown(() => {
          resolve();
        });
      } catch (error) {
        console.error('Error shutting down log4js:', error);
        resolve();
      }
    });
  }

  /**
   *
   * @param {Hapi.Server} server
   */
  async startServer(server: Hapi.Server) {
    try {
      appLogger.debug("Starting HAPI Server");
      await server.start();
      appLogger.info("Server running on %s", server.info.uri);
    } catch (error) {
      appLogger.fatal(error);
    }
  }


  async connectMongoDB(workerId: number) {
    if (!CONFIG.APP_CONFIG.databases.mongo) {
      return mongoLogger.debug("MongoDB Disabled");
    }

    try {
      mongoLogger.debug("Trying to make connection to DB");
      mongoose.set('strictQuery', true);

      // Wait for connection and verify it's successful
      const connection = await mongoose.connect(CONFIG.DB_CONFIG.mongo.URI);
      if (connection.connection.readyState !== 1) {
        throw new Error('Failed to establish MongoDB connection');
      }

      mongoLogger.debug("MongoDB Connected");

      // Proper cleanup on process exit
      process.on("exit", async () => {
        try {
          await mongoose.disconnect();
          mongoLogger.debug("MongoDB Disconnected");
        } catch (err) {
          mongoLogger.error("Error disconnecting from MongoDB:", err);
        }
      });

    } catch (e) {
      mongoLogger.error("DB Error: ", e);
      // Only exit if we're in a worker process
      if (workerId > 0) {
        process.exit(1);
      }
    }
  }

  async ensureEnvironmentFileExists() {
    appLogger.debug("Checking if .env file exists");
    await fs.copy(".env.example", ".env", {
      filter: (src, dest) => {
        return !!dest;
      },
      overwrite: false,
    });
  }


  startRedisServer() {
    try {
      this.spawner.spawn("redis-server", [" "]);
    } catch (e) {
      appLogger.error("Redis not installed");
    }
  }

  disableListeners(server: Hapi.Server) {
    server.events.removeAllListeners("response");
  }


  stopAllCrons() {
    CronManager.cancelAll();
  }

  stopRedis() {
    try {
      this.spawner.spawn("killall", ["redis-server"]);
    } catch (e) {
      appLogger.error("Redis not installed");
    }
  }

  /**
   * Cleanup server resources before shutdown
   */
  async cleanupResources(): Promise<void> {
    try {
      // Cleanup any open database connections
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
      }

      // Cleanup any running cron jobs
      if (CronManager.cancelAll) {
        CronManager.cancelAll();
      }


      // Wait for any pending operations to complete
      await delay(1000);
    } catch (error) {
      console.error('Error during resource cleanup:', error);
      throw error;
    }
  }


  async connectPostgresDB() {
    if (!CONFIG.APP_CONFIG.databases.postgres) return global.postgresLogger.info('Postgres Connect : Disabled');
    try {
      global.postgresLogger.debug('Trying to make connection to DB');
      const postgres = new Sequelize(CONFIG.DB_CONFIG.postgres);
      await postgres.authenticate();
      this.sequilizeInstance = postgres;
      global.postgresLogger.info('PostgresDB Connected');
      return postgres;
    } catch (e: any) {
      global.postgresLogger.error("DB Connect Error: ", e);
      throw new Error('POSTGRES_CONNECT_ERROR', e);
    }
  }

  async getSequelizeInstance() {
    if (!this.sequilizeInstance) {
      await this.connectPostgresDB();
    }
    return this.sequilizeInstance;
  }
}

const instance = new ServerHelper(process.pid);
export default instance;
