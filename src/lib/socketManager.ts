import Hapi from '@hapi/hapi';
import { Server, ServerOptions } from "socket.io";
import config from '../config';
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter';
import { setupMaster, setupWorker } from '@socket.io/sticky';
import cluster from 'node:cluster';

type SocketEmitMessage = {
    message: {
        type: string;
        statusCode: number;
        statusMessage: string;
        data: any
    }
}

class SocketManager {
    declare private server: Server | undefined;

    async setupPrimaryServer() {
        if (cluster.isPrimary) {
            const http = require('http');
            const httpServer = http.createServer();
            // setup sticky sessions
            setupMaster(httpServer, {
                loadBalancingMethod: "least-connection",
            });

            // setup connections between the workers
            setupPrimary();
            httpServer.listen(8002);
            socketLogger.info("primary socket server started ");
        }
    }


    /**
     * @param {Hapi.Server} server Hapi Server
     * @param {Partial<ServerOptions>} options Socket options
     * 
     * @returns {Server | void} Socket Server Instance;
     */
    async connectSocket(options?: Partial<ServerOptions>) {
        if (!config.APP_CONFIG.useSocket) return socketLogger.info("socket server disabled");
        const http = require('http');
        const httpServer = http.createServer();
        const io = new Server(httpServer, options);
        io.adapter(createAdapter());
        setupWorker(io);
        socketLogger.info("socket server started on path :" + io.path());
        io.on('connection', (socket) => {
            console.debug('New Socket.IO connection from:', socket.handshake.address);
        });
        this.server = io;
        return io;
    }

    emit(data: SocketEmitMessage) {
        if (!this.server) return socketLogger.error('Socket server not initiated');
        const currentConnections = this.currentConnections();
        if (currentConnections) {
            socketLogger.debug(JSON.stringify(data));
            this.server.emit('message', data);
        }
    }

    currentConnections(): number {
        if (!this.server) {
            socketLogger.error('Socket server not initiated');
            return 0;
        }
        return this.server.engine.clientsCount;
    }

    isConnected(): boolean {
        return !!this.server && this.currentConnections() > 0;
    }

    async disconnect(): Promise<void> {
        if (!this.server) {
            socketLogger.info('Socket server already disconnected');
            return;
        }

        try {
            // Close all client connections
            const sockets = await this.server.fetchSockets();
            for (const socket of sockets) {
                socket.disconnect(true);
            }

            // Close the server
            this.server.close();
            this.server = undefined;
            socketLogger.info('Socket server disconnected successfully');
        } catch (error) {
            socketLogger.error('Error disconnecting socket server:', error);
            throw error;
        }
    }
}

const instance = new SocketManager();
export default instance;



