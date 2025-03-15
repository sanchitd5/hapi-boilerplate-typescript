import { initServer, shutdownGracefully } from '../server';
import ServerHelper from '../helpers';
import MemoryMonitor from '../../lib/memoryMonitor';
import { Server } from '@hapi/hapi';

jest.mock('../helpers', () => ({
    ensureEnvironmentFileExists: jest.fn(),
    createServer: jest.fn(() => ({
        info: { uri: 'http://localhost:3001' },
        events: {
            on: jest.fn(),
            removeAllListeners: jest.fn()
        },
        listener: {
            on: jest.fn()
        },
        start: jest.fn(),
        stop: jest.fn()
    })),
    registerPlugins: jest.fn(),
    addViews: jest.fn(),
    setDefaultRoute: jest.fn(),
    addSwaggerRoutes: jest.fn(),
    bootstrap: jest.fn(),
    attachLoggerOnEvents: jest.fn(),
    startServer: jest.fn(),
    disableListeners: jest.fn(),
    stopAllCrons: jest.fn(),
    cleanupResources: jest.fn()
}));

jest.mock('../../lib/memoryMonitor', () => ({
    on: jest.fn(),
    start: jest.fn(),
    configure: jest.fn().mockReturnThis(),
    checkMemory: jest.fn()
}));

jest.mock('../../lib/memoryController', () => ({
    prepareForShutdown: jest.fn(),
    start: jest.fn()
}));

jest.mock('../../lib/socketManager', () => ({
    isConnected: jest.fn().mockReturnValue(false),
    disconnect: jest.fn()
}));

jest.mock('../../lib/NodeCacheManager', () => ({
    closeAllCacheInstances: jest.fn()
}));

describe('Server', () => {
    let server: Server;

    afterEach(async () => {
        if (server) {
            const originalExit = process.exit;
            (process as any).exit = jest.fn();
            await shutdownGracefully(server);
            (process as any).exit = originalExit;

        }
        jest.clearAllMocks();
    });

    describe('initServer', () => {
        it('should initialize the server correctly', async () => {
            server = await initServer();

            expect(ServerHelper.ensureEnvironmentFileExists).toHaveBeenCalled();
            expect(ServerHelper.createServer).toHaveBeenCalled();
            expect(ServerHelper.registerPlugins).toHaveBeenCalled();
            expect(ServerHelper.addViews).toHaveBeenCalled();
            expect(ServerHelper.setDefaultRoute).toHaveBeenCalled();
            expect(ServerHelper.addSwaggerRoutes).toHaveBeenCalled();
            expect(ServerHelper.bootstrap).toHaveBeenCalled();
            expect(ServerHelper.attachLoggerOnEvents).toHaveBeenCalled();
            expect(ServerHelper.startServer).toHaveBeenCalled();
 
        });
    });

    describe('shutdownGracefully', () => {
        it('should shut down the server gracefully', async () => {
            const originalExit = process.exit;
            (process as any).exit = jest.fn();
            server = await initServer();
            await shutdownGracefully(server);
            expect(process.exit).toHaveBeenCalledWith(0);
            (process as any).exit = originalExit;

            expect(ServerHelper.disableListeners).toHaveBeenCalled();
            expect(ServerHelper.stopAllCrons).toHaveBeenCalled();
            expect(ServerHelper.cleanupResources).toHaveBeenCalled();
            expect(server.stop).toHaveBeenCalled();
        });
    });
});
