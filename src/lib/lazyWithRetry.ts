/**
 * UNPRO — lazyWithRetry
 * Wraps React.lazy with automatic recovery for stale Vite chunks.
 *
 * Failure modes handled:
 *  - "Failed to fetch dynamically imported module" (chunk deleted after redeploy)
 *  - "Importing a module script failed"
 *  - generic network errors during dynamic import
 *
 * Strategy:
 *  1. First attempt: normal dynamic import.
 *  2. On failure that looks like a stale chunk: retry once with a cache-buster
 *     query string appended to the URL.
 *  3. If retry also fails: trigger ONE full page reload per session
 *     (sessionStorage flag) so the browser picks up the fresh index.html
 *     with the new asset hashes. If we already reloaded once, rethrow so
 *     the upstream error boundary can render its fallback.
 */
import { lazy, type ComponentType } from "react";

const RELOAD_FLAG_PREFIX = "__lazy_reload__";

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("Unable to preload CSS")
  );
}

function bustImportUrl(originalErr: unknown): string | null {
  if (!(originalErr instanceof Error)) return null;
  const match = originalErr.message.match(/https?:\/\/[^\s'"]+/);
  return match ? match[0] : null;
}

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  chunkKey?: string,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;

      // Retry once with a cache-buster on the failed URL.
      const url = bustImportUrl(err);
      if (url) {
        try {
          const bust = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
          return await import(/* @vite-ignore */ bust);
        } catch (retryErr) {
          if (!isChunkLoadError(retryErr)) throw retryErr;
        }
      }

      // Final fallback: hard reload once per session.
      if (typeof window !== "undefined") {
        const key = `${RELOAD_FLAG_PREFIX}${chunkKey ?? url ?? "global"}`;
        const alreadyReloaded = sessionStorage.getItem(key);
        if (!alreadyReloaded) {
          sessionStorage.setItem(key, "1");
          console.warn("[lazyWithRetry] stale chunk — hard reloading", url);
          window.location.reload();
          // Return a never-resolving promise so React doesn't render an error
          // while the reload kicks in.
          return new Promise<{ default: T }>(() => {});
        }
      }

      throw err;
    }
  });
}
