import { config } from 'dotenv';
import path from 'path';
import './src/global';

// Load environment variables from .env file
config({ path: path.resolve(__dirname, '.env.test') });

// Set up global variables needed for tests
(global as any).appLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
};

(global as any).mongoLogger = { ...global.appLogger };
(global as any).socketLogger = { ...global.appLogger };
(global as any).tokenLogger = { ...global.appLogger };
(global as any).uploadLogger = { ...global.appLogger };
(global as any).postgresLogger = { ...global.appLogger };

// Mock GC
global.gc = jest.fn();

// Set default timeout for tests
jest.setTimeout(30000);
