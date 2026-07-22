/**
 * UNPRO — Client-side wrapper for the Supabase pooler preflight.
 * Used by admin ops screens and the recovery queue script.
 * Never throws.
 */
export interface ClientPreflightResult {
  dataApi: boolean;
  postgres: boolean;
  attempts: number;
  lastError: string | null;
  timestampIso: string;
}

const BACKOFF_MS = [500, 1000, 2000, 4000, 8000];

export async function runClientPoolerPreflight(opts?: {
  supabaseUrl?: string;
  anonKey?: string;
  maxAttempts?: number;
  label?: string;
}): Promise<ClientPreflightResult> {
  const url = opts?.supabaseUrl ?? (import.meta as any).env?.VITE_SUPABASE_URL;
  const key = opts?.anonKey ?? (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;
  const label = opts?.label ?? "client_preflight";
  const max = Math.min(opts?.maxAttempts ?? 5, BACKOFF_MS.length);

  if (!url || !key) {
    return {
      dataApi: false,
      postgres: false,
      attempts: 0,
      lastError: "missing_env",
      timestampIso: new Date().toISOString(),
    };
  }

  let dataApi = false;
  let postgres = false;
  let lastError: string | null = null;
  let attempt = 0;

  for (attempt = 1; attempt <= max; attempt++) {
    try {
      const r = await fetch(`${url}/rest/v1/`, {
        headers: { apikey: key },
        signal: AbortSignal.timeout(5_000),
      });
      dataApi = r.status < 500;
    } catch {
      dataApi = false;
    }
    try {
      const r = await fetch(
        `${url}/rest/v1/platform_operation_outcomes?select=id&limit=1`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(6_000),
        },
      );
      if (r.status >= 500) {
        postgres = false;
        lastError = `postgres_http_${r.status}`;
      } else {
        postgres = true;
        lastError = null;
      }
    } catch (e) {
      postgres = false;
      lastError = (e as Error)?.message ?? "network_error";
    }

    // eslint-disable-next-line no-console
    console.log(
      `[${label}] attempt=${attempt} dataApi=${dataApi} postgres=${postgres} err=${lastError ?? "-"}`,
    );
    if (postgres) break;
    if (attempt < max) await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
  }

  return {
    dataApi,
    postgres,
    attempts: attempt,
    lastError,
    timestampIso: new Date().toISOString(),
  };
}
