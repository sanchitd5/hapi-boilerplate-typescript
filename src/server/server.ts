
import ServerHelper from "./helpers";
import SocketManager from "../lib/socketManager";

/**
 * @author Sanchit Dang
 * @description Initilize HAPI Server
 */
const initServer = async () => {

  await ServerHelper.ensureEnvironmentFileExists();

  //Create Server
  const server = ServerHelper.createServer();

  //Register All Plugins
  await ServerHelper.registerPlugins(server);

  //add views
  ServerHelper.addViews(server);

  //Default Routes
  ServerHelper.setDefaultRoute(server)

  // Add routes to Swagger documentation
  ServerHelper.addSwaggerRoutes(server);

  // Bootstrap Application
  ServerHelper.bootstrap();

  // Initiate Socket Server
  SocketManager.connectSocket((server.info.port ?? process.env.SOCKET_PORT ?? process.env.HAPI_PORT) as number);

  ServerHelper.attachLoggerOnEvents(server);

  // Start Server
  ServerHelper.startServer(server);
}

/**
 * @author Sanchit Dang
 * @description Start HAPI Server
 */
export const startMyServer = async () => {

  ServerHelper.configureLog4js();

  await ServerHelper.connectMongoDB();

  // Global variable to get app root folder path
  ServerHelper.setGlobalAppRoot();

  process.on("unhandledRejection", err => {
    appLogger.fatal(err);
    process.exit(1);
  });

  initServer();
}
