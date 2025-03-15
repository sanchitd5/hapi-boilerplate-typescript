import NodeCacheManager from '../NodeCacheManager';

describe('NodeCacheManager', () => {
  let cacheManager: any;

  beforeEach(() => {
    cacheManager = NodeCacheManager.getCacheInstance();
  });

  afterEach(() => {
    NodeCacheManager.closeAllCacheInstances();
  });

  describe('setCache', () => {
    it('should set a value in the cache', () => {
      const result = cacheManager.setCache('testCache', 'testKey', 'testValue');
      expect(result).toBe(true);
    });

    it('should convert non-string values to strings', () => {
      const value = { test: 'data' };
      cacheManager.setCache('testCache', 'testKey', value);
      const retrievedValue = cacheManager.getCacheValue('testCache', 'testKey');
      expect(retrievedValue).toBe(JSON.stringify(value));
    });

    it('should respect TTL if provided', () => {
      cacheManager.setCache('testCache', 'testKey', 'testValue', 0.1); // 100ms TTL
      expect(cacheManager.getCacheValue('testCache', 'testKey')).toBe('testValue');
      
      return new Promise(resolve => {
        setTimeout(() => {
          expect(cacheManager.getCacheValue('testCache', 'testKey')).toBe(null);
          resolve(true);
        }, 200);
      });
    });
  });

  describe('getCacheValue', () => {
    it('should return the cached value if it exists', () => {
      cacheManager.setCache('testCache', 'testKey', 'testValue');
      expect(cacheManager.getCacheValue('testCache', 'testKey')).toBe('testValue');
    });

    it('should return null if the key does not exist', () => {
      expect(cacheManager.getCacheValue('testCache', 'nonExistentKey')).toBe(null);
    });
  });

  describe('getAllCacheValues', () => {
    it('should return all values in a cache', () => {
      cacheManager.setCache('testCache', 'key1', 'value1');
      cacheManager.setCache('testCache', 'key2', 'value2');
      
      const allValues = cacheManager.getAllCacheValues('testCache');
      expect(allValues).toEqual({
        key1: 'value1',
        key2: 'value2'
      });
    });
  });
});
