import Socket from "socket.io";
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
     * 
     * @param {number} port Socket Port
     * @param {Partial<Socket.ServerOptions>} server Socket options
     * 
     * @returns {Socket.Server} Socket Server Instance;
     */
    connectSocket = (port: number, options?: Partial<Socket.ServerOptions>) => {
        const io = new Socket.Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(port, options);
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



