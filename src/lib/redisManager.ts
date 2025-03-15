import Redis from 'ioredis';
import { GenericObject } from '../types/index';

class RedisManager {
    declare private _client: Redis;
    constructor() {
        this._client = new Redis({
            port: parseInt(process.env.REDIS_PORT ?? '6379'), // Redis port
            host: process.env.REDIS_HOST ?? 'localhost', // Redis host
        });
    }

    client() {
        return this._client;
    }

    disconnect() {
        this._client.disconnect();
        this._client.quit();
    }

    async get(key: string): Promise<any> {
        return await this._client.get(key);
    }

    async set(key: string, value: any) {
        return await this._client.set(key, value);
    }

    async getJSON(key: string): Promise<GenericObject> {
        return JSON.parse(await this._client.get(key) ?? '{}');
    }

    async setJSON(key: string, value: GenericObject) {
        return await this._client.set(key, JSON.stringify(value));
    }

}

const instance = new RedisManager();
export default instance;