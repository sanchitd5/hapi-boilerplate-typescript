import { Server as HapiServer } from '@hapi/hapi';
import ServerHelper from "./helpers";
import SocketManager from "../lib/socketManager";

class Server {
  private declare socketManager: SocketManager;
  private declare server: HapiServer;

  /**
   * @author Sanchit Dang
   * @description Initilize HAPI Server
   */
  private async initilize(): Promise<HapiServer> {

    await ServerHelper.ensureEnvironmentFileExists();

    //Create Server
    this.server = await ServerHelper.createServer();

    //Register All Plugins
    this.server = await ServerHelper.registerPlugins(this.server);


    //Default Routes
    ServerHelper.setDefaultRoute(this.server);

    //add views
    await ServerHelper.addViews(this.server);

    // Add routes to Swagger documentation
    ServerHelper.addSwaggerRoutes(this.server);

    // Bootstrap Application
    ServerHelper.bootstrap();

    // Initiate Socket Server
    this.socketManager = new SocketManager(this.server);
    this.socketManager.connectSocket();

    ServerHelper.attachLoggerOnEvents(this.server);

    // Start Server
    this.server = await ServerHelper.startServer(this.server);

    return this.server;
  }

  private async shutdownGracefully(server?: HapiServer, fatal = false) {
    global.appLogger.info('Shutting down gracefully')
    if (server) {
      ServerHelper.removeListeners(server);
      await server.stop();
    }
    await ServerHelper.disconnectMongoDB();
    process.exit(fatal ? 0 : 1);
  }

  /**
   * @author Sanchit Dang
   * @description Start HAPI Server
   */
  async start() {
    await ServerHelper.connectMongoDB();
    await ServerHelper.connectPostgresDB();

    // Global variable to get app root folder path
    ServerHelper.setGlobalAppRoot();

    process.on("unhandledRejection", err => {
      global.appLogger.fatal(err);
      this.shutdownGracefully(this.server, true);
    });

    await this.initilize();

    process.on('SIGINT', () => this.shutdownGracefully(this.server));
    process.on('SIGTERM', () => this.shutdownGracefully(this.server));
  }

}

export default Server;