/**
 * UNPRO — Supabase pooler preflight
 *
 * Distinguishes Data API (PostgREST HTTP) availability from direct Postgres
 * (pooler) availability. Callers MUST refuse destructive operations when
 * `postgres === false`.
 *
 * Retry policy: max 5 attempts, exponential backoff 500ms → 8s.
 * Never throws — always resolves with a structured status.
 */
export interface PreflightResult {
  dataApi: boolean;
  postgres: boolean;
  attempts: number;
  lastError: string | null;
  timestampIso: string;
}

const BACKOFF_MS = [500, 1000, 2000, 4000, 8000];

export interface PreflightOptions {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey?: string;
  maxAttempts?: number;
  label?: string;
}

async function probeDataApi(url: string, anonKey: string): Promise<boolean> {
  try {
    const r = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(5_000),
    });
    // 200 or 401 both mean HTTP layer is up. 5xx means degraded.
    return r.status < 500;
  } catch {
    return false;
  }
}

async function probePostgres(url: string, key: string): Promise<{ ok: boolean; err: string | null }> {
  // Uses a cheap, well-known table read through PostgREST. If the pooler is
  // down, Cloudflare fronts return 522/523/524 and the body is HTML.
  try {
    const r = await fetch(`${url}/rest/v1/platform_operation_outcomes?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6_000),
    });
    if (r.status >= 500 || r.status === 522 || r.status === 523 || r.status === 524) {
      return { ok: false, err: `postgres_http_${r.status}` };
    }
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("json")) return { ok: false, err: `non_json_${r.status}` };
    return { ok: true, err: null };
  } catch (e) {
    return { ok: false, err: (e as Error)?.message ?? "network_error" };
  }
}

export async function runPoolerPreflight(opts: PreflightOptions): Promise<PreflightResult> {
  const label = opts.label ?? "preflight";
  const max = Math.min(opts.maxAttempts ?? 5, BACKOFF_MS.length);
  const key = opts.serviceRoleKey ?? opts.anonKey;

  let dataApi = false;
  let postgres = false;
  let lastError: string | null = null;
  let attempt = 0;

  for (attempt = 1; attempt <= max; attempt++) {
    dataApi = await probeDataApi(opts.supabaseUrl, opts.anonKey);
    const pg = await probePostgres(opts.supabaseUrl, key);
    postgres = pg.ok;
    lastError = pg.err;
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({ event: "preflight.attempt", label, attempt, dataApi, postgres, err: pg.err }),
    );
    if (postgres) break;
    if (attempt < max) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
    }
  }

  const result: PreflightResult = {
    dataApi,
    postgres,
    attempts: attempt,
    lastError,
    timestampIso: new Date().toISOString(),
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event: "preflight.result", label, ...result }));
  return result;
}
