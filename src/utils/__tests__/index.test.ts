import { CryptData, isEmpty, generateRandomString, generateRandomNumber } from '../index';

describe('Utils', () => {
  describe('CryptData', () => {
    it('should encrypt data correctly', () => {
      const data = 'password123';
      const encrypted = CryptData(data);
      expect(encrypted).not.toBe(data);
      expect(typeof encrypted).toBe('string');
    });

    it('should generate the same hash for the same input', () => {
      const data = 'password123';
      const encrypted1 = CryptData(data);
      const encrypted2 = CryptData(data);
      expect(encrypted1).toBe(encrypted2);
    });
  });

  describe('isEmpty', () => {
    it('should return true for null or undefined', () => {
      expect(isEmpty(null as any)).toBe(true);
      expect(isEmpty(undefined as any)).toBe(true);
    });

    it('should return true for empty objects', () => {
      expect(isEmpty({})).toBe(true);
    });

    it('should return true for empty arrays', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('should return false for non-empty objects', () => {
      expect(isEmpty({ a: 1 })).toBe(false);
    });

    it('should return false for non-empty arrays', () => {
      expect(isEmpty([1, 2, 3])).toBe(false);
    });
  });

  describe('generateRandomString', () => {
    it('should generate a string of specified length', () => {
      const length = 10;
      const result = generateRandomString(length);
      expect(result.length).toBe(length);
    });

    it('should generate different strings on multiple calls', () => {
      const result1 = generateRandomString(10);
      const result2 = generateRandomString(10);
      expect(result1).not.toBe(result2);
    });

    it('should default to 12 characters if no length specified', () => {
      const result = generateRandomString();
      expect(result.length).toBe(12);
    });
  });

  describe('generateRandomNumber', () => {
    it('should generate a number', () => {
      const result = generateRandomNumber();
      expect(typeof result).toBe('number');
    });

    it('should generate a number between 10000 and 99999', () => {
      const result = generateRandomNumber();
      expect(result).toBeGreaterThanOrEqual(10000);
      expect(result).toBeLessThanOrEqual(99999);
    });
  });
});
