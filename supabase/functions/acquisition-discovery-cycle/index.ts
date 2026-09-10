/**
 * acquisition-discovery-cycle
 *
 * Cycle autonome de DÉCOUVERTE d'entreprises de services résidentiels
 * admissibles à l'offre « 12 mois gratuits ».
 *
 * Chaîne réutilisée (aucun système parallèle) :
 *   acq-scrape-google-places (cache → dedupe → circuit breaker → budget atomique)
 *   → contractor_prospects (+ preuve CASL)
 *   → import-contractors (dédup E.164/courriel, provenance, verification_status)
 *   → acquisition_queue → acquisition-queue-worker (envoi) .
 *
 * Garde-fous non contournables :
 *  - fail-closed sur le drapeau system_flags.DISCOVERY_ENABLED ;
 *  - arrêt automatique quand la campagne gratuite atteint 10 activations ;
 *  - plafond par cycle (défaut 3 recherches) ET plafond serveur 25 appels/jour ;
 *  - aucune recherche si le cache (trade × ville) est encore frais ;
 *  - catégories de rénovation/construction exclues (non admissibles au gratuit) ;
 *  - aucun envoi ici : `auto_send:false` — l'envoi reste au worker sous CASL.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { normalizeServiceCategory, categoryName } from "../_shared/localServiceCategories.ts";
import { freeCampaignStatus } from "../_shared/freeCampaign.ts";
import { isFlagEnabled } from "../_shared/killSwitch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Catégories gratuites prioritaires (ordre = priorité de découverte). */
const PRIORITY_CATEGORIES: string[] = [
  "debarras-ramassage",
  "lavage-de-vitres",
  "ouverture-fermeture-piscine",
  "abris-temporaires",
  "entretien-gazon",
  "nettoyage-conduits",
  "nettoyage-tapis",
  "nettoyage-mobilier",
  "gestion-parasitaire",
  "entretien-menager",
];

/** Laval → Rive-Nord / Laurentides / Lanaudière → Montréal. */
const PRIORITY_CITIES: string[] = [
  "Laval",
  "Terrebonne",
  "Repentigny",
  "Blainville",
  "Saint-Jérôme",
  "Mascouche",
  "Boisbriand",
  "Sainte-Thérèse",
  "Mirabel",
  "Montréal",
];

const MAX_SEARCHES_PER_CYCLE = 6;
const DEFAULT_SEARCHES_PER_CYCLE = 3;

function norm(v: string): string {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ ok: false, error: "backend_credentials_missing" }, 500);

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const dryRun = Boolean((body as any).dry_run ?? false);
  const trigger = String((body as any).caller ?? "manual");
  const maxSearches = Math.min(
    Math.max(Number((body as any).max_searches ?? DEFAULT_SEARCHES_PER_CYCLE), 1),
    MAX_SEARCHES_PER_CYCLE,
  );
  const perSearchLimit = Math.min(Math.max(Number((body as any).limit ?? 20), 1), 20);

  // 1. Fail-closed : le drapeau doit exister et être vrai.
  let discoveryEnabled = false;
  try {
    discoveryEnabled = await isFlagEnabled(supabase, "DISCOVERY_ENABLED");
  } catch {
    discoveryEnabled = false;
  }
  if (!discoveryEnabled) {
    return json({ ok: false, blocked: true, blocked_reason: "discovery_disabled", searches_executed: 0 });
  }

  // 2. Arrêt automatique de la campagne à 10 activations réelles.
  const campaign = await freeCampaignStatus(supabase);
  if (campaign.reached) {
    return json({
      ok: false,
      blocked: true,
      blocked_reason: campaign.unreadable ? "campaign_counter_unreadable" : "free_campaign_target_reached",
      activated: campaign.activated,
      target: campaign.target,
      searches_executed: 0,
    });
  }

  // 3. Coupe-circuit fournisseur.
  const { data: circuit } = await supabase
    .from("provider_circuit_state")
    .select("state, kill_switch, last_error_code, remediation, retry_after")
    .eq("provider", "google_places")
    .maybeSingle();
  const circuitBlocked =
    !!circuit?.kill_switch ||
    (circuit?.state === "open" && (!circuit?.retry_after || new Date(circuit.retry_after) > new Date()));

  // 4. Sélection des paires (catégorie × ville) non encore couvertes par un cache frais.
  const { data: cacheRows } = await supabase
    .from("places_query_cache")
    .select("trade_norm, city_norm, expires_at")
    .eq("provider", "google_places");
  const fresh = new Set(
    (cacheRows ?? [])
      .filter((r: any) => r.expires_at && new Date(r.expires_at) > new Date())
      .map((r: any) => `${r.trade_norm}|${r.city_norm}`),
  );

  const { data: activeCats } = await supabase
    .from("founder_eligible_categories")
    .select("slug, name_fr, is_active")
    .eq("is_active", true);
  const activeSlugs = new Set((activeCats ?? []).map((c: any) => c.slug));

  const pairs: Array<{ slug: string; trade: string; city: string }> = [];
  for (const city of PRIORITY_CITIES) {
    for (const slug of PRIORITY_CATEGORIES) {
      if (activeSlugs.size > 0 && !activeSlugs.has(slug)) continue;
      const trade = categoryName(slug) ?? slug.replace(/-/g, " ");
      if (fresh.has(`${norm(trade)}|${norm(city)}`)) continue;
      pairs.push({ slug, trade, city });
    }
  }
  const selected = pairs.slice(0, maxSearches);

  if (dryRun) {
    return json({
      ok: true,
      dry_run: true,
      circuit_blocked: circuitBlocked,
      circuit_state: circuit?.state ?? null,
      kill_switch: circuit?.kill_switch ?? null,
      activated: campaign.activated,
      target: campaign.target,
      planned: selected,
      fresh_cache_pairs: fresh.size,
    });
  }

  const runInsert = await supabase
    .from("acquisition_discovery_runs")
    .insert({
      status: "running",
      trigger_source: trigger,
      searches_planned: selected.length,
      circuit_state: circuitBlocked ? "blocked" : (circuit?.state ?? "closed"),
      pairs: selected,
    })
    .select("id")
    .single();
  const runId = runInsert.data?.id ?? null;

  const tally = {
    searches_executed: 0,
    external_calls: 0,
    cache_hits: 0,
    found: 0,
    inserted: 0,
    enriched: 0,
    bridged_verified: 0,
    queued: 0,
  };
  const errors: Array<Record<string, unknown>> = [];

  if (circuitBlocked) {
    if (runId) {
      await supabase.from("acquisition_discovery_runs").update({
        status: "blocked",
        blocked_reason: circuit?.last_error_code ?? "circuit_open",
        finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }
    return json({
      ok: false,
      blocked: true,
      blocked_reason: circuit?.last_error_code ?? "circuit_open",
      remediation: circuit?.remediation ?? null,
      run_id: runId,
      ...tally,
    });
  }

  for (const pair of selected) {
    try {
      const res = await fetch(`${url}/functions/v1/acq-scrape-google-places`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          trade: pair.trade,
          city: pair.city,
          limit: perSearchLimit,
          caller: "acquisition-discovery-cycle",
        }),
      });
      const out = await res.json().catch(() => ({}));

      if (out?.blocked) {
        errors.push({ pair, error: out.error_code ?? "discovery_blocked", detail: out.remediation ?? null });
        // Le coupe-circuit vient de s'ouvrir (budget/quota) : on arrête le cycle.
        break;
      }

      tally.searches_executed += 1;
      tally.found += Number(out?.found ?? 0);
      tally.inserted += Number(out?.inserted ?? 0);
      tally.enriched += Number(out?.enriched_existing ?? 0);
      tally.external_calls += Number(out?.discovery?.external_calls ?? 0);
      if (out?.discovery?.cache_hit) tally.cache_hits += 1;

      const touched: string[] = Array.isArray(out?.touched_ids) ? out.touched_ids : [];
      if (touched.length === 0) continue;

      // 5. Pont vers le pipeline conforme : seules les fiches avec téléphone
      //    public ET catégorie gratuite admissible sont proposées à l'import.
      const { data: discovered } = await supabase
        .from("contractor_prospects")
        .select("id, business_name, phone, email, website_url, city, trade, google_business_url, google_place_id")
        .in("id", touched);

      const rows = (discovered ?? [])
        .filter((p: any) => p.phone || p.email)
        .filter((p: any) => normalizeServiceCategory(p.trade ?? pair.trade) !== null)
        .map((p: any) => ({
          company: p.business_name,
          phone: p.phone,
          email: p.email,
          website: p.website_url,
          city: p.city ?? pair.city,
          category: categoryName(pair.slug) ?? pair.trade,
          source_url:
            p.google_business_url ??
            (p.google_place_id ? `https://www.google.com/maps/place/?q=place_id:${p.google_place_id}` : null),
          source_type: "google_business_profile",
          source_publisher: "Google Places",
          region: pair.city,
        }))
        .filter((r: any) => !!r.company && !!r.source_url);

      if (rows.length === 0) continue;

      const importRes = await fetch(`${url}/functions/v1/import-contractors`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          rows,
          auto_send: false,
          segment: pair.slug,
          source_name: "google_places",
          source_type: "google_business_profile",
          source_publisher: "Google Places",
        }),
      });
      const imported = await importRes.json().catch(() => ({}));
      tally.bridged_verified += Number(imported?.verified ?? 0);
      tally.queued += Number(imported?.queued ?? 0);
      if (imported?.ok === false) errors.push({ pair, error: "import_failed", detail: imported?.message ?? null });
    } catch (e) {
      errors.push({ pair, error: "cycle_exception", detail: (e as Error).message });
    }
  }

  if (runId) {
    await supabase.from("acquisition_discovery_runs").update({
      status: errors.length > 0 && tally.searches_executed === 0 ? "failed" : "completed",
      finished_at: new Date().toISOString(),
      ...tally,
      errors,
    }).eq("id", runId);
  }

  await supabase.from("acquisition_source_health").upsert({
    source: "google_places",
    status: tally.searches_executed > 0 ? "healthy" : "degraded",
    last_run_at: new Date().toISOString(),
    last_success_at: tally.inserted > 0 ? new Date().toISOString() : null,
    found_last_run: tally.found,
    consecutive_zero_runs: tally.found > 0 ? 0 : 1,
    updated_at: new Date().toISOString(),
  }, { onConflict: "source" });

  await supabase.from("agent_logs").insert({
    agent_name: "acquisition-discovery-cycle",
    log_type: errors.length > 0 ? "warning" : "info",
    message: `Découverte : ${tally.searches_executed} recherche(s), ${tally.found} fiches, ${tally.inserted} nouvelles, ${tally.bridged_verified} vérifiées, ${tally.queued} en file.`,
    metadata: { run_id: runId, ...tally, errors },
  });

  return json({ ok: true, run_id: runId, ...tally, errors, activated: campaign.activated, target: campaign.target });
});
