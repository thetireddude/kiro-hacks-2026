/**
 * Retry utility with exponential backoff
 * 
 * This module provides retry logic for handling transient failures
 * in API calls and other async operations.
 */

export interface RetryOptions {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the function result or rejects after all retries fail
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   {
 *     maxAttempts: 3,
 *     baseDelay: 1000,
 *     maxDelay: 10000,
 *     backoffMultiplier: 2
 *   }
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay, backoffMultiplier } = options

  let lastError: Error | unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Attempt to execute the function
      return await fn()
    } catch (error) {
      lastError = error

      // If this was the last attempt, throw the error
      if (attempt === maxAttempts) {
        throw error
      }

      // Calculate delay with exponential backoff
      // Formula: min(baseDelay * (backoffMultiplier ^ (attempt - 1)), maxDelay)
      const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attempt - 1)
      const delay = Math.min(exponentialDelay, maxDelay)

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError
}
