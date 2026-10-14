/**
 * dataForSeo — TARGETED enrichment adapter for already-known official records.
 *
 * Endpoint: POST https://api.dataforseo.com/v3/business_data/business_listings/search/live
 *
 * Hard rules:
 *  - Never used for discovery. One already-ingested official company at a time.
 *  - Auth is built server-side only from DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD.
 *    The header is never logged, never returned, never persisted.
 *  - Provenance stays distinct: aggregator_sourced, pending website confirmation.
 *  - Reviews/photos/content are NEVER read into AI content generation here.
 */

export const DATAFORSEO_ENDPOINT =
  "https://api.dataforseo.com/v3/business_data/business_listings/search/live";

/** Server-only. Returns null when credentials are absent. Never log the result. */
export function buildAuthHeader(login?: string | null, password?: string | null): string | null {
  if (!login || !password) return null;
  return `Basic ${btoa(`${login}:${password}`)}`;
}

/** Strip anything that could leak credentials or raw payloads to the client. */
export function redactError(message: string): string {
  return message
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, "Basic [redacted]")
    .replace(/([A-Za-z0-9._%+-]+):([^@\s]+)@/g, "[redacted]@")
    .slice(0, 200);
}

/* ------------------------------ request ------------------------------ */

export type ListingQuery = {
  title: string;
  locality?: string | null;
  region?: string | null;
  limit?: number;
};

export function buildRequestBody(q: ListingQuery): unknown[] {
  const limit = Math.min(Math.max(q.limit ?? 10, 1), 10);
  const locationParts = [q.locality, q.region, "Quebec, Canada"].filter(Boolean);
  return [{
    title: q.title,
    location_name: locationParts.join(", "),
    limit,
    order_by: ["rating.value,desc"],
  }];
}

/* ------------------------------ parsing ------------------------------ */

export type ListingItem = {
  title: string | null;
  phone: string | null;
  url: string | null;
  domain: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
};

export type ParsedResponse =
  | { ok: true; items: ListingItem[]; cost: number; items_count: number }
  | { ok: false; error_code: string; retryable: boolean; cost: number };

const RETRYABLE_STATUS = new Set([50000, 50100, 50200, 50400, 50500]);

// deno-lint-ignore no-explicit-any
export function parseResponse(body: any): ParsedResponse {
  if (!body || typeof body !== "object") return { ok: false, error_code: "malformed_response", retryable: false, cost: 0 };
  const cost = typeof body.cost === "number" ? body.cost : 0;
  const status = Number(body.status_code ?? 0);
  if (status && status !== 20000) {
    return { ok: false, error_code: `api_${status}`, retryable: RETRYABLE_STATUS.has(status), cost };
  }
  const task = Array.isArray(body.tasks) ? body.tasks[0] : null;
  if (!task) return { ok: false, error_code: "no_task", retryable: false, cost };
  const tStatus = Number(task.status_code ?? 0);
  if (tStatus && tStatus !== 20000) {
    return { ok: false, error_code: `task_${tStatus}`, retryable: RETRYABLE_STATUS.has(tStatus), cost };
  }
  const result = Array.isArray(task.result) ? task.result[0] : null;
  const rawItems = Array.isArray(result?.items) ? result.items : [];
  const items: ListingItem[] = rawItems.map((i: Record<string, unknown>) => {
    const addressInfo = (i.address_info ?? {}) as Record<string, unknown>;
    return {
      title: (i.title as string) ?? null,
      phone: (i.phone as string) ?? null,
      url: (i.url as string) ?? (i.domain ? `https://${i.domain}` : null),
      domain: (i.domain as string) ?? null,
      address: (i.address as string) ?? null,
      city: (addressInfo.city as string) ?? null,
      zip: (addressInfo.zip as string) ?? null,
    };
  });
  return { ok: true, items, cost, items_count: items.length };
}

/* ------------------------------ matching ------------------------------ */

export type MatchTarget = {
  business_name_norm: string;
  city: string | null;
  postal_code: string | null;
  official_domain: string | null;
};

export type MatchOutcome = {
  status: "matched" | "ambiguous" | "no_match";
  score: number;
  item: ListingItem | null;
  conflict_reason: string | null;
};

export const MATCH_THRESHOLD = 70;

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(inc|ltd|ltee|enr|enrg|senc|sencrl|les|le|la)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const A = new Set(a.split(" ").filter(Boolean));
  const B = new Set(b.split(" ").filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let hit = 0;
  for (const t of A) if (B.has(t)) hit++;
  return hit / Math.max(A.size, B.size);
}

export function scoreCandidate(target: MatchTarget, item: ListingItem): { score: number; conflict: string | null } {
  const nameScore = tokenOverlap(target.business_name_norm, norm(item.title));
  let score = nameScore * 60;
  let conflict: string | null = null;

  const targetCity = norm(target.city);
  const itemCity = norm(item.city ?? item.address);
  if (targetCity && itemCity) {
    if (itemCity.includes(targetCity) || targetCity.includes(itemCity)) score += 20;
    else conflict = "city_conflict";
  }

  const tz = (target.postal_code ?? "").replace(/\s/g, "").toUpperCase();
  const iz = (item.zip ?? "").replace(/\s/g, "").toUpperCase();
  if (tz && iz) {
    if (tz === iz) score += 15;
    else if (tz.slice(0, 3) === iz.slice(0, 3)) score += 8;
  }

  if (target.official_domain && item.domain) {
    if (item.domain.replace(/^www\./, "") === target.official_domain) score += 15;
  }

  return { score: Math.round(Math.min(score, 100)), conflict };
}

export function selectMatch(target: MatchTarget, items: ListingItem[]): MatchOutcome {
  if (items.length === 0) return { status: "no_match", score: 0, item: null, conflict_reason: null };
  const scored = items
    .map((item) => ({ item, ...scoreCandidate(target, item) }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  const runnerUp = scored[1];

  if (best.conflict) return { status: "ambiguous", score: best.score, item: null, conflict_reason: best.conflict };
  if (best.score < MATCH_THRESHOLD) return { status: "no_match", score: best.score, item: null, conflict_reason: null };
  if (runnerUp && best.score - runnerUp.score < 10 && !runnerUp.conflict) {
    return { status: "ambiguous", score: best.score, item: null, conflict_reason: "tie_between_candidates" };
  }
  return { status: "matched", score: best.score, item: best.item, conflict_reason: null };
}

/** Cache policy: matched = 30 days, no_match/ambiguous = 90 days. */
export function nextEligibleAt(status: MatchOutcome["status"], from = new Date()): string {
  const days = status === "matched" ? 30 : 90;
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

export const MAX_TRANSIENT_RETRIES = 2;
