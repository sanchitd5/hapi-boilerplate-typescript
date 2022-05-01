import { Server as HapiServer } from '@hapi/hapi';
import ServerHelper from "./helpers";
import SocketManager from "../lib/socketManager";

class Server {
  private declare socketManager: SocketManager;

  /**
   * @author Sanchit Dang
   * @description Initilize HAPI Server
   */
  private async initilize(): Promise<HapiServer> {

    await ServerHelper.ensureEnvironmentFileExists();

    //Create Server
    let server = await ServerHelper.createServer();

    //Register All Plugins
    server = await ServerHelper.registerPlugins(server);


    //Default Routes
    ServerHelper.setDefaultRoute(server)

    //add views
    await ServerHelper.addViews(server);

    // Add routes to Swagger documentation
    ServerHelper.addSwaggerRoutes(server);

    // Bootstrap Application
    ServerHelper.bootstrap();

    // Initiate Socket Server
    this.socketManager = new SocketManager(server);
    this.socketManager.connectSocket();

    ServerHelper.attachLoggerOnEvents(server);

    // Start Server
    return await ServerHelper.startServer(server);

  }

  private async shutdownGracefully(server?: HapiServer) {
    global.appLogger.info('Shutting down gracefully')
    if (server) {
      ServerHelper.removeListeners(server);
      await server.stop();
    }
    await ServerHelper.disconnectMongoDB();
    process.exit(server ? 0 : 1);
  }

  /**
   * @author Sanchit Dang
   * @description Start HAPI Server
   */
  async start() {
    ServerHelper.configureLog4js();

    await ServerHelper.connectMongoDB();

    // Global variable to get app root folder path
    ServerHelper.setGlobalAppRoot();

    process.on("unhandledRejection", err => {
      global.appLogger.fatal(err);
      this.shutdownGracefully();
    });

    const hapiServer = await this.initilize();

    process.on('SIGINT', () => this.shutdownGracefully(hapiServer));
    process.on('SIGTERM', () => this.shutdownGracefully(hapiServer))
  }

}

export default Server;