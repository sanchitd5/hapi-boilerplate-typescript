import Hapi from "@hapi/hapi";
import Joi from "joi";
import log4js from "log4js";
import SwaggerPlugins from "../plugins";
import * as handlebars from "handlebars";
import mongoose from "mongoose";
import CONFIG from "../config/index";
import Path from "path";
import BootStrap from "../utils/bootStrap";
import Routes from "../routes";
import fs from 'fs-extra';

/**
 * @description Helper file for the server
 */
class ServerHelper {

  setGlobalAppRoot() {
    global.appRoot = Path.resolve(__dirname)
  }


  bootstrap() {
    BootStrap.bootstrapAdmin((err: any) => {
      if (err) appLogger.debug(err)
    });
  }

  /**
   * 
   * @param {Hapi.Server} server 
   */
  addSwaggerRoutes(server: Hapi.Server) {
    server.route(Routes);
  }

  /**
   * 
   * @param {Hapi.Server} server 
   */
  attachLoggerOnEvents(server: Hapi.Server) {
    server.events.on("response", (request: any) => {
      appLogger.info(
        `${request.info.remoteAddress} : ${request.method.toUpperCase()} ${request.url.pathname} --> ${request.response.statusCode}`);
      appLogger.info("Request payload:", request.payload);
    });
  }

  /**
   * @returns {Hapi.Server} A Hapi Server
   */
  createServer(): Hapi.Server {
    const server = new Hapi.Server({
      app: {
        name: process.env.APP_NAME || "default"
      },
      port: process.env.HAPI_PORT || 8000,
      routes: { cors: true }
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
    (server as any).views({
      engines: {
        html: handlebars
      },
      relativeTo: __dirname,
      path: "../../views"
    });
  }

  /**
   * @author Sanchit Dang
   * @description sets default route for the server
   * @param {Hapi.Server} server HAPI Server
   * @param {String} defaultRoute Optional - default route
   */
  setDefaultRoute(server: Hapi.Server, defaultRoute?: string) {
    if (defaultRoute === undefined) defaultRoute = "/"
    server.route({
      method: "GET",
      path: defaultRoute,
      handler: (req, res) => {
        return (res as any).view("welcome");
      }
    });
  }

  /**
   * 
   * @param {Hapi.Server} server HAPI Server
   */
  async registerPlugins(server: Hapi.Server) {
    try {
      await (server as any).register(SwaggerPlugins);
      server.log(["info"], "Plugins Loaded");
    } catch (e) {
      server.log(["error"], "Error while loading plugins : " + e);
    }
  }

  configureLog4js = () => {
    // Configuration for log4js.
    log4js.configure({
      appenders: {
        App: { type: 'console' },
        Upload_Manager: { type: 'console' },
        Socket_Manager: { type: 'console' },
        Token_Manager: { type: 'console' },
        Mongo_Manager: { type: 'console' }
      },
      categories: {
        default: { appenders: ['App'], level: 'trace' },
        Upload_Manager: { appenders: ['Upload_Manager'], level: 'trace' },
        Socket_Manager: { appenders: ['Socket_Manager'], level: 'trace' },
        Token_Manager: { appenders: ['Token_Manager'], level: 'trace' },
        Mongo_Manager: { appenders: ['Mongo_Manager'], level: 'trace' }
      }
    });
    // Global Logger variables for logging
    global.appLogger = log4js.getLogger('App');
    global.uploadLogger = log4js.getLogger('Upload_Manager');
    global.socketLogger = log4js.getLogger('Socket_Manager');
    global.tokenLogger = log4js.getLogger('Token_Manager');
    global.mongoLogger = log4js.getLogger('Mongo_Manager');
  }

  /**
   * 
   * @param {Hapi.Server} server 
   */
  async startServer(server: Hapi.Server) {
    try {
      await server.start();
      appLogger.info("Server running on %s", server.info.uri);
    } catch (error) {
      appLogger.fatal(error);
    }
  }

  async connectMongoDB() {
    if (!CONFIG.APP_CONFIG.databases.mongo) return mongoLogger.info('MongoDB Disabled');;
    try {
      mongoLogger.debug('Trying to make connection to DB');
      await mongoose.connect(CONFIG.DB_CONFIG.mongo.URI);
      mongoLogger.info('MongoDB Connected');
    } catch (e) {
      mongoLogger.error("DB Error: ", e);
      process.exit(1);
    }
  }

  async ensureEnvironmentFileExists() {
    await fs.copy('.env.example', '.env', {
      filter: (src, dest) => {
        return !!dest;
      }
    });
  }
}

const instance = new ServerHelper();
export default instance;