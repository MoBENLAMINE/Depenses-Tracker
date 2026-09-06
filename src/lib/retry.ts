// ============================================================
// Helper de retry — backoff exponentiel pur (testable, sans RN)
// ============================================================

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Renvoie false pour ne pas retenter sur une erreur donnée. */
  shouldRetry?: (error: unknown) => boolean;
}

/** Délai d'attente après un échec à la tentative `attempt` (1-based). */
export function computeRetryDelay(attempt: number, baseDelayMs = 500, maxDelayMs = 8000): number {
  const exp = baseDelayMs * 2 ** (attempt - 1);
  return Math.min(exp, maxDelayMs);
}

/**
 * Exécute `fn` avec reprise sur échec (backoff exponentiel borné).
 * Rejette si toutes les tentatives échouent.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 8000,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !shouldRetry(error)) throw error;
      const delay = computeRetryDelay(attempt, baseDelayMs, maxDelayMs);
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
