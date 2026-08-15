/**
 * placesGateway — canonical, resilient access layer for Google Places discovery.
 *
 * Guarantees:
 *  1. Consumption reduction — 1 page per call by default (was up to 3), results
 *     cached per (trade × city) for 14 days and reused across all callers.
 *  2. Cache + dedupe BEFORE any external call.
 *  3. Circuit breaker — quota/billing/auth errors open the circuit; while open,
 *     no external call is made at all (stale cache is served instead).
 *  4. Never starve recruitment — a blocked provider returns a structured,
 *     non-fatal result so callers fall back to existing inventory.
 *  5. Full observability — every attempt is logged in `places_api_calls`.
 *
 * PROTECTED: every discovery path must go through `searchPlacesResilient`.
 */

const PROVIDER = "google_places";
const DEFAULT_TTL_DAYS = 14;
/**
 * COST INVARIANT (incident 2026-08 — Google Places billing loop):
 * launch-commander ran every minute, launch-agent-scout called Places directly
 * without asking for a phone number, inserted unusable rows, rejected them,
 * and looped. Discovery now has exactly one billable path with three hard locks:
 *   1. one page max per search (never more than 20 results / 1 external call),
 *   2. a 14-day cache per (trade × city) — including negative results,
 *   3. an atomic DB reservation (`reserve_places_external_call`) capped at
 *      25 external calls per America/Toronto day, server-side, non-overridable.
 * Never bypass `searchPlacesResilient` for automated discovery.
 */
const MAX_PAGES = 1;
const MAX_RESULTS_PER_SEARCH = 20;


export interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  location?: { latitude: number; longitude: number };
  addressComponents?: Array<{ longText: string; shortText: string; types: string[] }>;
}

export type PlacesSearchResult =
  | {
      ok: true;
      places: PlaceResult[];
      cache_hit: boolean;
      stale: boolean;
      source: "cache" | "cache_stale" | "api";
      external_calls: number;
      calls_avoided: number;
    }
  | {
      ok: false;
      blocked: true;
      error_code: string;
      state: string;
      retry_after: string | null;
      remediation: string;
      detail?: string;
    };

export function norm(v: string): string {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cacheKey(trade: string, city: string): string {
  return `${PROVIDER}|${norm(trade)}|${norm(city)}`;
}

/** Dedupe places by place id, preserving order. */
export function dedupePlaces(places: PlaceResult[]): PlaceResult[] {
  const seen = new Set<string>();
  const out: PlaceResult[] = [];
  for (const p of places) {
    if (!p?.id || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

async function logCall(
  supabase: any,
  row: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("places_api_calls").insert({ provider: PROVIDER, ...row });
  if (error) console.error("[placesGateway] call log failed:", error.message);
}

export async function getCircuitState(supabase: any) {
  const { data } = await supabase
    .from("provider_circuit_state")
    .select("*")
    .eq("provider", PROVIDER)
    .maybeSingle();
  return data ?? null;
}

function circuitOpen(state: any): boolean {
  if (!state) return false;
  if (state.kill_switch) return true;
  if (state.state !== "open") return false;
  if (!state.retry_after) return true;
  return new Date(state.retry_after) > new Date();
}

async function tripCircuit(
  supabase: any,
  opts: { errorCode: string; message: string; remediation: string; failureCount: number; cooldownMs: number },
) {
  const retryAfter = new Date(Date.now() + opts.cooldownMs).toISOString();
  await supabase.from("provider_circuit_state").upsert(
    {
      provider: PROVIDER,
      state: "open",
      failure_count: opts.failureCount,
      last_error_code: opts.errorCode,
      last_error_message: opts.message.slice(0, 1000),
      remediation: opts.remediation,
      opened_at: new Date().toISOString(),
      retry_after: retryAfter,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" },
  );
  return retryAfter;
}

async function closeCircuit(supabase: any) {
  await supabase.from("provider_circuit_state").upsert(
    {
      provider: PROVIDER,
      state: "closed",
      failure_count: 0,
      last_error_code: null,
      last_error_message: null,
      remediation: null,
      opened_at: null,
      retry_after: null,
      last_success_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" },
  );
}

async function readCache(supabase: any, key: string) {
  const { data } = await supabase
    .from("places_query_cache")
    .select("id, results, result_count, fetched_at, expires_at, hit_count")
    .eq("cache_key", key)
    .maybeSingle();
  return data ?? null;
}

async function writeCache(
  supabase: any,
  key: string,
  trade: string,
  city: string,
  query: string,
  places: PlaceResult[],
  ttlDays: number,
) {
  const now = new Date();
  const { error } = await supabase.from("places_query_cache").upsert(
    {
      cache_key: key,
      provider: PROVIDER,
      trade_norm: norm(trade),
      city_norm: norm(city),
      query_text: query,
      results: places,
      result_count: places.length,
      fetched_at: now.toISOString(),
      expires_at: new Date(now.getTime() + ttlDays * 86400000).toISOString(),
      updated_at: now.toISOString(),
    },
    { onConflict: "cache_key" },
  );
  if (error) console.error("[placesGateway] cache write failed:", error.message);
}

/**
 * Resilient Places text search.
 * Order: kill switch → fresh cache → open circuit (stale cache) → external call.
 */
export async function searchPlacesResilient(
  supabase: any,
  opts: {
    trade: string;
    city: string;
    limit: number;
    caller: string;
    forceRefresh?: boolean;
    ttlDays?: number;
  },
): Promise<PlacesSearchResult> {
  const { trade, city, caller } = opts;
  const limit = Math.min(Math.max(Number(opts.limit) || 20, 1), 60);
  const ttlDays = opts.ttlDays ?? DEFAULT_TTL_DAYS;
  const key = cacheKey(trade, city);
  const query = `${trade} ${city} Québec`;
  const logBase = { trade_norm: norm(trade), city_norm: norm(city), caller };

  const cached = await readCache(supabase, key);
  const cacheFresh = cached && new Date(cached.expires_at) > new Date();
  const pagesNeeded = Math.min(Math.ceil(limit / 20), MAX_PAGES);

  // 1. Fresh cache wins — zero external calls.
  if (cacheFresh && !opts.forceRefresh) {
    const places = dedupePlaces((cached.results ?? []) as PlaceResult[]).slice(0, limit);
    await supabase
      .from("places_query_cache")
      .update({ hit_count: (cached.hit_count ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", cached.id);
    await logCall(supabase, {
      ...logBase,
      outcome: "cache_hit",
      cache_hit: true,
      external_calls: 0,
      calls_avoided: pagesNeeded,
      result_count: places.length,
    });
    return { ok: true, places, cache_hit: true, stale: false, source: "cache", external_calls: 0, calls_avoided: pagesNeeded };
  }

  // 2. Circuit breaker — never call the provider while open.
  const state = await getCircuitState(supabase);
  if (circuitOpen(state)) {
    if (cached) {
      const places = dedupePlaces((cached.results ?? []) as PlaceResult[]).slice(0, limit);
      await logCall(supabase, {
        ...logBase,
        outcome: "circuit_open_stale_cache",
        cache_hit: true,
        external_calls: 0,
        calls_avoided: pagesNeeded,
        result_count: places.length,
        error_code: state?.last_error_code ?? "circuit_open",
      });
      return { ok: true, places, cache_hit: true, stale: true, source: "cache_stale", external_calls: 0, calls_avoided: pagesNeeded };
    }
    await logCall(supabase, {
      ...logBase,
      outcome: "circuit_open",
      cache_hit: false,
      external_calls: 0,
      calls_avoided: pagesNeeded,
      error_code: state?.last_error_code ?? "circuit_open",
    });
    return {
      ok: false,
      blocked: true,
      error_code: state?.kill_switch ? "kill_switch_enabled" : (state?.last_error_code ?? "circuit_open"),
      state: "open",
      retry_after: state?.retry_after ?? null,
      remediation:
        state?.remediation ??
        "Google Places discovery is paused by the circuit breaker. Recruitment continues on existing inventory until the provider recovers.",
    };
  }

  // 3. External call — credentials.
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const mapsConnectorKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  const legacyApiKey =
    Deno.env.get("GOOGLE_PLACES_SERVER_KEY") || Deno.env.get("GOOGLE_PLACES_API_KEY");
  const useConnectorGateway = Boolean(lovableKey && mapsConnectorKey);
  if (!useConnectorGateway && !legacyApiKey) {
    await logCall(supabase, { ...logBase, outcome: "misconfigured", cache_hit: false, error_code: "credentials_missing" });
    return {
      ok: false,
      blocked: true,
      error_code: "credentials_missing",
      state: "closed",
      retry_after: null,
      remediation: "Add GOOGLE_PLACES_API_KEY (or the Google Maps connector) in Project Settings → Secrets.",
    };
  }

  const url = useConnectorGateway
    ? "https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText"
    : "https://places.googleapis.com/v1/places:searchText";
  const fieldMask = [
    "places.id","places.displayName","places.formattedAddress","places.nationalPhoneNumber",
    "places.websiteUri","places.googleMapsUri","places.rating","places.userRatingCount",
    "places.primaryType","places.location","places.addressComponents",
  ].join(",");

  const collected: PlaceResult[] = [];
  let pageToken: string | undefined;
  let externalCalls = 0;

  for (let page = 0; page < pagesNeeded && collected.length < limit; page++) {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(useConnectorGateway
          ? { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": mapsConnectorKey! }
          : { "X-Goog-Api-Key": legacyApiKey! }),
        "X-Goog-FieldMask": fieldMask + (pageToken ? "" : ",nextPageToken"),
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "fr-CA",
        regionCode: "CA",
        pageSize: Math.min(20, limit - collected.length),
        ...(pageToken ? { pageToken } : {}),
      }),
    });
    externalCalls++;

    if (!resp.ok) {
      const raw = await resp.text();
      let parsed: any = null;
      try { parsed = JSON.parse(raw); } catch { /* non-JSON */ }
      const gErr = parsed?.error ?? {};
      const gStatus: string = gErr.status ?? "";
      const gMessage: string = gErr.message ?? raw.slice(0, 500);

      const isQuota = resp.status === 429 || gStatus === "RESOURCE_EXHAUSTED";
      const isAuth = resp.status === 401 || resp.status === 403 || gStatus === "PERMISSION_DENIED";
      const isBilling = /billing/i.test(gMessage);

      const errorCode = isQuota
        ? "quota_exhausted"
        : isBilling ? "billing_disabled"
        : isAuth ? "auth_or_api_not_enabled"
        : `http_${resp.status}`;

      const remediation = isQuota
        ? "Google Places daily quota exhausted. Raise the quota in Google Cloud Console (IAM & Admin → Quotas) or wait for the daily reset (midnight US/Pacific). Discovery is paused; recruitment keeps running on cached + existing inventory."
        : isBilling ? "Enable billing on the Google Cloud project backing the Places API key."
        : isAuth ? "Enable 'Places API (New)' for this key and allow the server IP/referrer."
        : `Unexpected Google Places response (HTTP ${resp.status}).`;

      const failureCount = (state?.failure_count ?? 0) + 1;
      // Quota/billing → long cooldown. Auth → medium. Transient → exponential 5m…60m.
      const cooldownMs = isQuota || isBilling
        ? 60 * 60 * 1000
        : isAuth
          ? 30 * 60 * 1000
          : Math.min(5 * 60 * 1000 * Math.pow(2, failureCount - 1), 60 * 60 * 1000);
      const retryAfter = await tripCircuit(supabase, {
        errorCode, message: gMessage, remediation, failureCount, cooldownMs,
      });

      // Mirror into legacy source health so existing admin panels stay truthful.
      await supabase.from("acquisition_source_health").upsert({
        source: "google_business",
        status: isQuota || isBilling ? "degraded" : "scraper_down",
        last_run_at: new Date().toISOString(),
        found_last_run: 0,
        last_error_code: errorCode,
        last_error_message: gMessage.slice(0, 1000),
        metadata: { http_status: resp.status, google_status: gStatus, remediation, breaker_until: retryAfter },
      }, { onConflict: "source" });

      // Degrade gracefully to stale cache instead of starving recruitment.
      if (cached) {
        const places = dedupePlaces((cached.results ?? []) as PlaceResult[]).slice(0, limit);
        await logCall(supabase, {
          ...logBase, outcome: "provider_error_stale_cache", cache_hit: true,
          external_calls: externalCalls, calls_avoided: 0, result_count: places.length, error_code: errorCode,
        });
        return { ok: true, places, cache_hit: true, stale: true, source: "cache_stale", external_calls: externalCalls, calls_avoided: 0 };
      }

      await logCall(supabase, {
        ...logBase, outcome: "provider_error", cache_hit: false,
        external_calls: externalCalls, calls_avoided: 0, error_code: errorCode,
      });
      return { ok: false, blocked: true, error_code: errorCode, state: "open", retry_after: retryAfter, remediation, detail: gMessage };
    }

    const data = await resp.json();
    collected.push(...((data.places ?? []) as PlaceResult[]));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  const places = dedupePlaces(collected).slice(0, limit);
  await writeCache(supabase, key, trade, city, query, dedupePlaces(collected), ttlDays);
  await closeCircuit(supabase);
  await supabase.from("acquisition_source_health").upsert({
    source: "google_business",
    status: places.length > 0 ? "healthy" : "degraded",
    last_run_at: new Date().toISOString(),
    last_success_at: new Date().toISOString(),
    found_last_run: places.length,
    last_error_code: null,
    last_error_message: null,
    metadata: {},
  }, { onConflict: "source" });

  await logCall(supabase, {
    ...logBase, outcome: "api_success", cache_hit: false,
    external_calls: externalCalls, calls_avoided: 0, result_count: places.length,
  });

  return { ok: true, places, cache_hit: false, stale: false, source: "api", external_calls: externalCalls, calls_avoided: 0 };
}
