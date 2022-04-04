import Hapi from '@hapi/hapi';
import Socket from "socket.io";
import config from '../config';
/**
* Please use socketLogger for logging in this file try to abstain from console
* levels of logging:
* - TRACE - ‘blue’
* - DEBUG - ‘cyan’
* - INFO - ‘green’
* - WARN - ‘yellow’
* - ERROR - ‘red’
* - FATAL - ‘magenta’
*/

type SocketEmitMessage = {
    message: {
        type: string;
        statusCode: number;
        statusMessage: string;
        data: any
    }
}

interface ServerToClientEvents {
    message: (arg0: SocketEmitMessage) => any;
}

interface ClientToServerEvents {
    hello: () => void;
}

interface InterServerEvents {
    ping: () => void;
}

interface SocketData {
    name: string;
    age: number;
}

class SocketManager { 
    declare private server: Socket.Server;

    /**
     * @param {Hapi.Server} server Hapi Server
     * @param {Partial<Socket.ServerOptions>} options Socket options
     * 
     * @returns {Socket.Server|void} Socket Server Instance;
     */
    connectSocket(server: Hapi.Server, options?: Partial<Socket.ServerOptions>) {
        if (!config.APP_CONFIG.useSocket) return socketLogger.info("socket server disabled");;
        const io = new Socket.Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server.app, options);
        socketLogger.info("socket server started");
        io.on('connection', (socket) => {
            socketLogger.info("connection established: ", socket.id);
            const messageToSend: SocketEmitMessage = {
                message: {
                    type: 'connection',
                    statusCode: 200,
                    statusMessage: 'WELCOME TO ',
                    data: ""
                }
            };
            socket.emit('message', messageToSend);
        });
        this.server = io;
    }

    emit(data: SocketEmitMessage) {
        this.server.emit('message', data);
    }
}

const instance = new SocketManager();
export default instance;



