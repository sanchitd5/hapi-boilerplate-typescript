import NodeCache from 'node-cache';

/**
 * @author Sanchit Dang
 * @description NodeCacheManager is a singleton class that manages multiple NodeCache instances.
 * It ensures that there is only one instance of NodeCacheManager and multiple instances of NodeCache.
 * It provides a way to set and get values from the cache.
 * It also ensures that the cache is created only once and is reused.
 * It also provides a way to get the cache instance if needed.
 */
class NodeCacheManager {
    private cacheInstances: { [key: string]: NodeCache } = {};
    // Singleton class
    private static instance: NodeCacheManager;

    /**
     * @description Private constructor to ensure that the class is a singleton class and cannot be instantiated from outside.
     * @returns NodeCacheManager instance
     */
    static getCacheInstance(): NodeCacheManager {
        if (NodeCacheManager.instance) {
            return NodeCacheManager.instance;
        }
        NodeCacheManager.instance = new NodeCacheManager();
        return NodeCacheManager.instance;
    }

    static closeAllCacheInstances(): void {
        if (NodeCacheManager.instance) {
            Object.values(NodeCacheManager.instance.cacheInstances).forEach((cache) => {
                cache.close();
            });
            NodeCacheManager.instance.cacheInstances = {};
        }
    }

    private ensureCache(cacheName: string): NodeCache {
        if (this.cacheInstances[cacheName]) {
            return this.cacheInstances[cacheName];
        }
        this.cacheInstances[cacheName] = new NodeCache({
            deleteOnExpire: true,
        });
        return this.cacheInstances[cacheName];
    }

    setCache(cacheName: string, key: string, value: string, timeToLive?: number): boolean {
        console.debug('setting cache', cacheName, key, timeToLive);
        const cache = this.ensureCache(cacheName);
        if (typeof value !== 'string') {
            // Convert to string if not already a string
            value = JSON.stringify(value);
        }
        if (timeToLive) {
            return cache.set(key, value, timeToLive);
        }
        return cache.set(key, value);
    }

    getCacheValue(cacheName: string, key: string): any {
        console.debug('getting cache value from ', cacheName, key);
        const cache = this.ensureCache(cacheName);
        if (cache.has(key)) {
            return cache.get(key);
        }
        return null;
    }

    getAllCacheValues(cacheName: string): { [key: string]: any } {
        console.debug('getting all cache values from ', cacheName);
        const cache = this.ensureCache(cacheName);
        const keys = cache.keys();
        const cacheValuesWithKeys: { [key: string]: any } = {};
        keys.forEach((key) => {
            const value = cache.get(key);
            if (value) {
                try {
                    cacheValuesWithKeys[key] = JSON.parse(String(value));
                } catch (e) {
                    // If the value is not a JSON string, return the value as it is
                    cacheValuesWithKeys[key] = value;
                }
            }
        });
        return cacheValuesWithKeys;
    }
}

export default NodeCacheManager;