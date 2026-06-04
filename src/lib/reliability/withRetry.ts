/**
 * UNPRO — Reliability: withRetry
 * Standard exponential backoff for external services.
 * See mem://standards/production-reliability-framework (Rule 7)
 */
import { RETRY_BACKOFF_MIN } from "./types";

export interface RetryOptions {
  /** Max attempts (default = RETRY_BACKOFF_MIN.length + 1 = 5) */
  maxAttempts?: number;
  /** Predicate: should this error be retried? Default: true for any error. */
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  /** Optional label for logs. */
  label?: string;
  /** Override backoff (ms per attempt). */
  delaysMs?: number[];
}

const defaultDelays = RETRY_BACKOFF_MIN.map((m) => m * 60_000);

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const delays = opts.delaysMs ?? defaultDelays;
  const max = opts.maxAttempts ?? delays.length + 1;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = opts.shouldRetry ? opts.shouldRetry(err, attempt) : true;
      if (!retryable || attempt >= max) break;
      const delay = delays[Math.min(attempt - 1, delays.length - 1)];
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** Compute the next retry timestamp (ISO) for storage. */
export function nextRetryAt(attempt: number): string {
  const idx = Math.min(attempt - 1, RETRY_BACKOFF_MIN.length - 1);
  return new Date(Date.now() + RETRY_BACKOFF_MIN[idx] * 60_000).toISOString();
}
