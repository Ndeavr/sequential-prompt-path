/**
 * UNPRO — safeAsyncOperation
 * Race any async op against a timeout, with retries and a fallback value.
 * Never throws — always resolves to a structured result.
 */
import { logBoot } from "@/lib/bootDebug";

export type SafeAsyncResult<T> = {
  ok: boolean;
  data: T | null;
  error: Error | null;
  durationMs: number;
  timedOut: boolean;
  attempts: number;
};

export interface SafeAsyncOptions<T> {
  timeoutMs?: number;
  retries?: number;
  fallback?: T | null;
  label?: string;
  retryDelayMs?: number;
}

export async function safeAsyncOperation<T>(
  fn: () => Promise<T>,
  opts: SafeAsyncOptions<T> = {}
): Promise<SafeAsyncResult<T>> {
  const { timeoutMs = 8000, retries = 0, fallback = null, label = "anon", retryDelayMs = 600 } = opts;
  const start = performance.now();
  let lastError: Error | null = null;
  let attempts = 0;

  logBoot(`SAFE_ASYNC:${label}:start`, { timeoutMs, retries });

  for (let i = 0; i <= retries; i++) {
    attempts++;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let didTimeout = false;
    try {
      const result = await Promise.race<T>([
        fn(),
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => {
            didTimeout = true;
            reject(new Error(`Timeout after ${timeoutMs}ms`));
          }, timeoutMs);
        }),
      ]);
      if (timeoutId) clearTimeout(timeoutId);
      logBoot(`SAFE_ASYNC:${label}:ok`, { attempts });
      return { ok: true, data: result, error: null, durationMs: performance.now() - start, timedOut: false, attempts };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = err instanceof Error ? err : new Error(String(err));
      logBoot(`SAFE_ASYNC:${label}:${didTimeout ? "timeout" : "fail"}`, { attempts, msg: lastError.message });
      if (i < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs * (i + 1)));
        logBoot(`SAFE_ASYNC:${label}:retry`, { next: i + 2 });
      }
    }
  }

  logBoot(`SAFE_ASYNC:${label}:fallback`, { attempts });
  return {
    ok: false,
    data: fallback,
    error: lastError,
    durationMs: performance.now() - start,
    timedOut: lastError?.message?.startsWith("Timeout") ?? false,
    attempts,
  };
}

/** Quick heuristic AIPP score from public signals — deterministic, never invented. */
export function heuristicAippScore(input: {
  websiteUrl?: string | null;
  phone?: string | null;
  city?: string | null;
  businessName?: string | null;
  rbqNumber?: string | null;
  email?: string | null;
}): number {
  let s = 25; // baseline
  if (input.websiteUrl && /^https?:\/\//i.test(input.websiteUrl)) s += 12;
  if (input.websiteUrl?.startsWith("https://")) s += 4;
  if (input.phone && input.phone.replace(/\D/g, "").length >= 10) s += 6;
  if (input.email && /@/.test(input.email)) s += 4;
  if (input.city && input.city.length >= 2) s += 3;
  if (input.rbqNumber && input.rbqNumber.length >= 6) s += 5;
  if (input.businessName && input.businessName.length >= 4) s += 2;
  return Math.max(20, Math.min(60, s));
}
