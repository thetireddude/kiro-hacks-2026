/**
 * Unit tests for retry logic with exponential backoff
 * 
 * **Validates: Requirements 2.4, 4.4**
 * 
 * Tests cover:
 * - Immediate success (no retry needed)
 * - Retry on failure with eventual success
 * - Max attempts exceeded
 * - Exponential backoff timing
 */

import { retryWithBackoff, RetryOptions } from './retry';

describe('retryWithBackoff', () => {
  const defaultOptions: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 100, // Use shorter delays for faster tests
    maxDelay: 10000,
    backoffMultiplier: 2,
  };

  describe('immediate success', () => {
    it('succeeds on first attempt without retry', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(fn, defaultOptions);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('returns the correct value on first attempt', async () => {
      const expectedValue = { data: 'test', count: 42 };
      const fn = jest.fn().mockResolvedValue(expectedValue);

      const result = await retryWithBackoff(fn, defaultOptions);

      expect(result).toEqual(expectedValue);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('handles different return types', async () => {
      const numberFn = jest.fn().mockResolvedValue(123);
      const stringFn = jest.fn().mockResolvedValue('test');
      const objectFn = jest.fn().mockResolvedValue({ key: 'value' });
      const arrayFn = jest.fn().mockResolvedValue([1, 2, 3]);

      expect(await retryWithBackoff(numberFn, defaultOptions)).toBe(123);
      expect(await retryWithBackoff(stringFn, defaultOptions)).toBe('test');
      expect(await retryWithBackoff(objectFn, defaultOptions)).toEqual({ key: 'value' });
      expect(await retryWithBackoff(arrayFn, defaultOptions)).toEqual([1, 2, 3]);
    });
  });

  describe('retry on failure with eventual success', () => {
    it('retries once and succeeds on second attempt', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(fn, defaultOptions);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries twice and succeeds on third attempt', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(fn, defaultOptions);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('preserves the successful return value after retries', async () => {
      const expectedValue = { status: 'ok', data: [1, 2, 3] };
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue(expectedValue);

      const result = await retryWithBackoff(fn, defaultOptions);

      expect(result).toEqual(expectedValue);
    });
  });

  describe('max attempts exceeded', () => {
    it('throws error after max attempts with all failures', async () => {
      const error = new Error('Persistent failure');
      const fn = jest.fn().mockRejectedValue(error);

      await expect(retryWithBackoff(fn, defaultOptions)).rejects.toThrow('Persistent failure');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws the last error encountered', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockRejectedValueOnce(new Error('Second error'))
        .mockRejectedValueOnce(new Error('Final error'));

      await expect(retryWithBackoff(fn, defaultOptions)).rejects.toThrow('Final error');
    });

    it('respects custom maxAttempts value', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Failure'));
      const customOptions: RetryOptions = {
        ...defaultOptions,
        maxAttempts: 5,
      };

      await expect(retryWithBackoff(fn, customOptions)).rejects.toThrow('Failure');
      expect(fn).toHaveBeenCalledTimes(5);
    });

    it('handles maxAttempts of 1 (no retries)', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Immediate failure'));
      const customOptions: RetryOptions = {
        ...defaultOptions,
        maxAttempts: 1,
      };

      await expect(retryWithBackoff(fn, customOptions)).rejects.toThrow('Immediate failure');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('exponential backoff timing', () => {
    it('calculates correct delay for first retry', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await retryWithBackoff(fn, defaultOptions);
      const endTime = Date.now();

      // First retry should wait baseDelay (100ms)
      // Allow some tolerance for test execution time
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('doubles delay on second retry (exponential backoff)', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await retryWithBackoff(fn, defaultOptions);
      const endTime = Date.now();

      // First retry: 100ms, Second retry: 200ms = 300ms total
      // Allow some tolerance for test execution time
      expect(endTime - startTime).toBeGreaterThanOrEqual(300);
      expect(endTime - startTime).toBeLessThan(400);
    });

    it('respects maxDelay cap on exponential growth', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValue('success');

      const customOptions: RetryOptions = {
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 150, // Cap at 150ms
        backoffMultiplier: 2,
      };

      const startTime = Date.now();
      await retryWithBackoff(fn, customOptions);
      const endTime = Date.now();

      // First retry: 100ms, Second retry: 150ms (capped from 200ms) = 250ms total
      expect(endTime - startTime).toBeGreaterThanOrEqual(250);
      expect(endTime - startTime).toBeLessThan(350);
    });

    it('uses custom backoffMultiplier', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValue('success');

      const customOptions: RetryOptions = {
        maxAttempts: 3,
        baseDelay: 50,
        maxDelay: 10000,
        backoffMultiplier: 3, // Triple each time
      };

      const startTime = Date.now();
      await retryWithBackoff(fn, customOptions);
      const endTime = Date.now();

      // First retry: 50ms, Second retry: 150ms = 200ms total
      expect(endTime - startTime).toBeGreaterThanOrEqual(200);
      expect(endTime - startTime).toBeLessThan(300);
    });
  });

  describe('edge cases', () => {
    it('handles function that throws synchronously', async () => {
      const fn = jest.fn(() => {
        throw new Error('Synchronous error');
      });

      await expect(retryWithBackoff(fn, defaultOptions)).rejects.toThrow('Synchronous error');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('handles non-Error rejections', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce('string error')
        .mockRejectedValueOnce({ error: 'object error' })
        .mockRejectedValueOnce(42);

      await expect(retryWithBackoff(fn, defaultOptions)).rejects.toBe(42);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('handles zero baseDelay', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');

      const customOptions: RetryOptions = {
        ...defaultOptions,
        baseDelay: 0,
      };

      const result = await retryWithBackoff(fn, customOptions);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('handles very large maxDelay', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');

      const customOptions: RetryOptions = {
        maxAttempts: 2,
        baseDelay: 50,
        maxDelay: 1000000, // Very large cap
        backoffMultiplier: 2,
      };

      const startTime = Date.now();
      const result = await retryWithBackoff(fn, customOptions);
      const endTime = Date.now();

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      // Should use actual calculated delay (50ms), not the cap
      expect(endTime - startTime).toBeGreaterThanOrEqual(50);
      expect(endTime - startTime).toBeLessThan(150);
    });
  });

  describe('real-world scenarios', () => {
    it('simulates API retry with network errors', async () => {
      const mockApiCall = jest.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValue({ status: 200, data: 'API response' });

      const result = await retryWithBackoff(mockApiCall, defaultOptions);

      expect(result).toEqual({ status: 200, data: 'API response' });
      expect(mockApiCall).toHaveBeenCalledTimes(3);
    });

    it('simulates rate limit scenario with eventual success', async () => {
      const mockApiCall = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValue({ status: 200, data: 'Success after rate limit' });

      const rateLimitOptions: RetryOptions = {
        maxAttempts: 3,
        baseDelay: 50,
        maxDelay: 10000,
        backoffMultiplier: 2,
      };

      const result = await retryWithBackoff(mockApiCall, rateLimitOptions);

      expect(result).toEqual({ status: 200, data: 'Success after rate limit' });
      expect(mockApiCall).toHaveBeenCalledTimes(2);
    });

    it('simulates permanent failure after all retries', async () => {
      const mockApiCall = jest.fn()
        .mockRejectedValue(new Error('Service unavailable'));

      await expect(retryWithBackoff(mockApiCall, defaultOptions)).rejects.toThrow('Service unavailable');
      expect(mockApiCall).toHaveBeenCalledTimes(3);
    });
  });
});

