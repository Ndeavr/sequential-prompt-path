/**
 * launch-agent-scout — seeds launch_leads.
 *
 * COST INVARIANT (incident 2026-08 — Google Places billing loop):
 * this function used to call Places directly (googleMapsConnector /
 * resolvePlacesKey / legacy textsearch) with a field mask that did not include
 * a phone number. It inserted rows it then rejected with `no_phone_no_email`,
 * and launch-commander re-triggered it every minute → one billable call/minute.
 * Discovery now goes through `searchPlacesResilient` ONLY (cache + circuit +
 * atomic 25 calls/day budget), and a place without a phone number never enters
 * the pool.
 *
 * Strategy:
 *   1. Pull eligible rows from the existing `outbound_companies` pool (priority trades + cities).
 *   2. If the batch is < batch / 2, refill via the resilient Places gateway for the
 *      next (trade, city) pair from launch_mode_state.scout_cursor.
 *   3. Insert deduped rows into launch_leads as DISCOVERED with stage timeout metadata.
 *
 * Never silently fails: every exit path either reports inserted > 0 OR a precise BlockReason.
 */
import { corsHeaders, adminClient, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome, BlockReason, FailureCode } from "../_shared/reliability.ts";
import { searchPlacesResilient, type PlaceResult } from "../_shared/placesGateway.ts";
import { captureScrapeEvidenceForProfile } from "../_shared/caslEvidence.ts";


const PRIORITY_TRADES = [
  "isolation", "toiture", "fondation", "drain", "drain francais",
  "cvc", "hvac", "chauffage", "electricien", "plombier",
  "entrepreneur general", "general",
];
const PRIORITY_TRADE_QUERIES = [
  "entreprise isolation", "entreprise toiture", "entreprise fondation",
  "drain francais", "cvc chauffage", "electricien residentiel", "plombier residentiel",
];
const PRIORITY_CITIES = [
  "Montreal", "Laval", "Longueuil", "Terrebonne", "Blainville",
  "Mirabel", "Saint-Jerome", "Repentigny",
];

const DISCOVER_TIMEOUT_SECONDS = 60;

function normalize(s: string | null | undefined): string {
  return (s ?? "").toLowerCase();
}

function matchesPriority(c: { trade?: string | null; specialty?: string | null; city?: string | null }) {
  const t = normalize(c.trade) + " " + normalize(c.specialty);
  const city = normalize(c.city);
  const tradeOk = PRIORITY_TRADES.some(p => t.includes(p));
  const cityOk = PRIORITY_CITIES.some(p => city.includes(p.toLowerCase()));
  return { tradeOk, cityOk };
}

async function googlePlacesRefill(sb: ReturnType<typeof adminClient>): Promise<{
  inserted_into_pool: number;
  query: string;
  trade: string;
  city: string;
  error?: string;
}> {
  const useConnector = googleConnectorAvailable();
  const resolved = useConnector ? { key: "connector" } : resolvePlacesKey();
  if (!resolved) return { inserted_into_pool: 0, query: "", trade: "", city: "", error: "no_places_key (tried connector, GOOGLE_PLACES_SERVER_KEY, GOOGLE_MAPS_API_KEY, GOOGLE_PLACES_API_KEY)" };

  // Round-robin cursor
  const { data: state } = await sb.from("launch_mode_state").select("scout_cursor").eq("id", true).maybeSingle();
  const cursor = (state?.scout_cursor as { trade_idx?: number; city_idx?: number } | null) ?? { trade_idx: 0, city_idx: 0 };
  const trade = PRIORITY_TRADE_QUERIES[cursor.trade_idx % PRIORITY_TRADE_QUERIES.length];
  const city = PRIORITY_CITIES[cursor.city_idx % PRIORITY_CITIES.length];
  const next = {
    trade_idx: (cursor.trade_idx + 1) % PRIORITY_TRADE_QUERIES.length,
    city_idx: cursor.trade_idx + 1 >= PRIORITY_TRADE_QUERIES.length ? (cursor.city_idx + 1) % PRIORITY_CITIES.length : cursor.city_idx,
  };

  const query = `${trade} ${city} Québec`;

  // Prefer the Lovable Google Maps connector (server-to-server, no referer restrictions).
  let results: Array<Record<string, unknown>> = [];
  if (useConnector) {
    const res = await placesSearchTextRaw(
      query,
      { language: "fr-CA", region: "CA", maxResults: 20 },
      "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.businessStatus",
    );
    if (res.google_status && !["OK", "ZERO_RESULTS"].includes(res.google_status)) {
      return { inserted_into_pool: 0, query, trade, city, error: `connector: ${res.google_status}: ${res.error_message ?? ""}` };
    }
    results = res.places.map((p: any) => ({
      name: p.displayName?.text ?? "",
      formatted_address: p.formattedAddress ?? "",
      place_id: p.id ?? "",
      rating: p.rating ?? null,
      user_ratings_total: p.userRatingCount ?? null,
      business_status: p.businessStatus ?? "OPERATIONAL",
    }));
  } else {
    const key = (resolved as { key: string }).key;
    let resp: Response;
    try {
      resp = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=ca&language=fr&key=${key}`,
      );
    } catch (e) {
      return { inserted_into_pool: 0, query, trade, city, error: `network: ${String(e)}` };
    }
    if (!resp.ok) {
      return { inserted_into_pool: 0, query, trade, city, error: `http_${resp.status}` };
    }
    const json = (await resp.json()) as { results?: Array<Record<string, unknown>>; status?: string; error_message?: string };
    if (json.status && !["OK", "ZERO_RESULTS"].includes(json.status)) {
      return { inserted_into_pool: 0, query, trade, city, error: `${json.status}: ${json.error_message ?? ""}` };
    }
    results = json.results ?? [];
  }

  const rows = results
    .filter(r => r.business_status === "OPERATIONAL" || !r.business_status)
    .map(r => ({
      company_name: String(r.name ?? "").slice(0, 200),
      city,
      trade,
      specialty: trade,
      address: String(r.formatted_address ?? ""),
      google_place_id: String(r.place_id ?? ""),
      google_rating: r.rating ?? null,
      review_count: r.user_ratings_total ?? null,
      business_status: r.business_status ?? "OPERATIONAL",
      region: "QC",
    }))
    .filter(r => r.company_name && r.google_place_id);

  if (rows.length === 0) {
    // advance cursor anyway so we don't loop on the same empty query
    await sb.from("launch_mode_state").update({ scout_cursor: next }).eq("id", true);
    return { inserted_into_pool: 0, query, trade, city };
  }

  // Upsert into outbound_companies on google_place_id (skip duplicates)
  const { data: existing } = await sb
    .from("outbound_companies")
    .select("google_place_id")
    .in("google_place_id", rows.map(r => r.google_place_id));
  const seen = new Set((existing ?? []).map((r: any) => r.google_place_id));
  const fresh = rows.filter(r => !seen.has(r.google_place_id));
  if (fresh.length > 0) {
    const { data: inserted } = await sb.from("outbound_companies")
      .insert(fresh)
      .select("id, google_place_id, phone, email");
    // CASL evidence — publicly conspicuous Google Business Profile.
    for (const row of inserted ?? []) {
      const raw = results.find((r: any) => String(r.place_id ?? "") === row.google_place_id);
      if (!raw) continue;
      try {
        await captureScrapeEvidenceForProfile(sb, {
          outbound_company_id: row.id,
          phone: row.phone ?? null,
          email: row.email ?? null,
          source_url: `https://www.google.com/maps/place/?q=place_id:${row.google_place_id}`,
          source_type: "google_business_profile",
          source_publisher: "Google Places",
          business_relevance_explanation: `Publicly listed business in category "${trade}" in ${city}, QC. UNPRO offer targets contractors in this trade.`,
          page_content_for_hash: JSON.stringify(raw),
          capture_agent: "launch-agent-scout",
        });
      } catch (e) {
        console.warn("[casl] launch-scout capture failed", (e as Error).message);
      }
    }
  }
  await sb.from("launch_mode_state").update({ scout_cursor: next, current_trade: trade, current_city: city }).eq("id", true);
  return { inserted_into_pool: fresh.length, query, trade, city };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const batch = Math.min(Number(body.batch ?? 25), 100);
  const sb = adminClient();

  const { data: existing } = await sb.from("launch_leads").select("external_ref");
  const seen = new Set((existing ?? []).map((r: any) => r.external_ref).filter(Boolean));

  // Pass 1 — read pool
  const fetchPool = async () => sb
    .from("outbound_companies")
    .select("id, company_name, city, trade, specialty, phone, email, region")
    .order("created_at", { ascending: false })
    .limit(500);

  let { data: pool, error } = await fetchPool();
  if (error) {
    await reportOutcome({
      operation: "launch.scout.run",
      outcome: "failed",
      failure_code: FailureCode.SUPABASE_TIMEOUT,
      payload: { error: error.message },
    });
    await logLaunchEvent({ agent: "launch-agent-scout", event: "blocked", success: false, message: error.message });
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rejection = { no_phone_no_email: 0, outside_territory: 0, duplicate: 0 };
  const pickCandidates = (rows: any[]) => rows.filter((c: any) => {
    if (seen.has(c.id)) { rejection.duplicate++; return false; }
    if (!c.phone && !c.email) { rejection.no_phone_no_email++; return false; }
    const { tradeOk, cityOk } = matchesPriority(c);
    if (!tradeOk && !cityOk) { rejection.outside_territory++; return false; }
    return true;
  });

  let candidates = pickCandidates(pool ?? []).slice(0, batch);

  // Pass 1b — FALLBACK to contractor_prospects when outbound_companies is starved.
  // contractor_prospects is where scraping actually lands; use it directly so
  // the pipeline can breathe even if outbound_companies is empty or contact-less.
  let fallback_source = "outbound_companies";
  if (candidates.length === 0) {
    const { data: prospects } = await sb
      .from("contractor_prospects")
      .select("id, business_name, city, trade, category_slug, phone, email, region, do_not_contact")
      .not("phone", "is", null)
      .neq("phone", "")
      .neq("do_not_contact", true)
      .order("created_at", { ascending: false })
      .limit(500);
    const mapped = (prospects ?? []).map((p: any) => ({
      id: p.id,
      company_name: p.business_name,
      city: p.city,
      trade: p.trade ?? p.category_slug,
      specialty: p.trade ?? p.category_slug,
      phone: p.phone,
      email: p.email,
      region: p.region,
    }));
    const before = rejection.no_phone_no_email + rejection.outside_territory + rejection.duplicate;
    candidates = pickCandidates(mapped).slice(0, batch);
    if (candidates.length > 0) {
      fallback_source = "contractor_prospects";
      pool = mapped as any;
    } else {
      // record that fallback ran but nothing survived filters
      await logLaunchEvent({
        agent: "launch-agent-scout", event: "fallback_empty", success: false,
        message: `contractor_prospects fallback: 0/${mapped.length} passed filters`,
        payload: { rejection, delta: rejection.no_phone_no_email + rejection.outside_territory + rejection.duplicate - before },
      });
    }
  }


  // Pass 2 — refill via Google Places if pool yielded too few
  let refill: Awaited<ReturnType<typeof googlePlacesRefill>> | null = null;
  if (candidates.length < Math.floor(batch / 2)) {
    refill = await googlePlacesRefill(sb);
    if (refill.error && refill.inserted_into_pool === 0) {
      await reportOutcome({
        operation: "launch.scout.run",
        outcome: "blocked",
        block_reason: BlockReason.MISSING_SECRET,
        next_action: `Google Places refill failed: ${refill.error}`,
      });
      await logLaunchEvent({
        agent: "launch-agent-scout", event: "blocked", success: false,
        message: `google_places: ${refill.error} (q="${refill.query}")`,
      });
      // continue — we may still have some candidates from pool
    }
    if (refill.inserted_into_pool > 0) {
      const refreshed = await fetchPool();
      pool = refreshed.data;
      candidates = pickCandidates(pool ?? []).slice(0, batch);
    }
  }

  if (candidates.length === 0) {
    const reason = (pool ?? []).length === 0
      ? "No companies in pool and refill returned 0"
      : `All ${(pool ?? []).length} pool rows rejected (no_phone_no_email=${rejection.no_phone_no_email}, outside_territory=${rejection.outside_territory}, duplicate=${rejection.duplicate})`;
    await reportOutcome({
      operation: "launch.scout.run",
      outcome: "partial",
      failure_code: FailureCode.SCOUT_NO_RESULTS,
      next_action: reason,
      payload: { rejection, refill },
    });
    await logLaunchEvent({
      agent: "launch-agent-scout", event: "blocked", success: false,
      message: reason, payload: { rejection, refill },
    });
    await sb.from("launch_mode_state").update({
      last_blocker_agent: "launch-agent-scout",
      last_blocker_reason: reason,
      last_blocker_at: new Date().toISOString(),
    }).eq("id", true);
    return new Response(JSON.stringify({ ok: true, inserted: 0, rejection, refill }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date().toISOString();
  const rows = candidates.map((c: any) => ({
    external_ref: c.id,
    contractor_id: null,
    company_name: c.company_name,
    city: c.city,
    trade: c.trade ?? c.specialty,
    phone: c.phone,
    email: c.email,
    lead_status: "DISCOVERED",
    source_agent: "launch-agent-scout",
    current_stage_started_at: now,
    current_stage_heartbeat_at: now,
    current_stage_timeout_seconds: DISCOVER_TIMEOUT_SECONDS,
  }));

  const { error: insErr } = await sb.from("launch_leads").insert(rows);
  if (insErr) {
    await reportOutcome({
      operation: "launch.scout.run",
      outcome: "failed",
      failure_code: FailureCode.UNKNOWN,
      payload: { error: insErr.message },
    });
    await logLaunchEvent({ agent: "launch-agent-scout", event: "blocked", success: false, message: insErr.message });
    return new Response(JSON.stringify({ ok: false, error: insErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await logLaunchEvent({
    agent: "launch-agent-scout",
    event: "discovered_batch",
    success: true,
    message: `+${rows.length} leads via ${fallback_source}`,
    payload: { count: rows.length, rejection, refill, fallback_source },
  });
  await reportOutcome({
    operation: "launch.scout.run",
    outcome: "achieved",
    payload: { inserted: rows.length, rejection, refill, fallback_source },
  });
  await sb.from("launch_mode_state").update({
    current_stage_label: "DISCOVERING",
    last_success_at: now,
    last_success_description: `${rows.length} contractor(s) découvert(s)`,
  }).eq("id", true);

  return new Response(JSON.stringify({ ok: true, inserted: rows.length, rejection, refill, fallback_source }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

