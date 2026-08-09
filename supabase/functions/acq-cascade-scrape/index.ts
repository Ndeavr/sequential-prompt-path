/**
 * acq-cascade-scrape
 *
 * Orchestrateur scrape en cascade :
 *  1. Google Places (base structurée) via acq-scrape-google-places
 *  2. Firecrawl (enrichissement website) via acq-enrich-contractor sur chaque ID inséré
 *
 * Body: { trade: string, city: string, limit?: number, enrich?: boolean }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const trade = String(body.trade ?? "").trim();
    const city = String(body.city ?? "").trim();
    const limit = Math.min(Number(body.limit ?? 20), 60);
    const enrich = body.enrich !== false;

    if (!trade || !city) {
      return new Response(JSON.stringify({ error: "trade and city required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Google Places base
    const placesResp = await fetch(`${supabaseUrl}/functions/v1/acq-scrape-google-places`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ trade, city, limit, dry_run: false, caller: "acq-cascade-scrape" }),
    });

    const placesData = await placesResp.json();
    if (!placesResp.ok) {
      return new Response(
        JSON.stringify({ step: "google_places", error: placesData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Discovery paused by the circuit breaker (quota/billing/auth) is NOT a
    // pipeline failure — the cascade ends cleanly so recruitment keeps running
    // on existing inventory.
    if (placesData?.blocked) {
      return new Response(
        JSON.stringify({
          ok: true,
          discovery_paused: true,
          step: "google_places",
          error_code: placesData.error_code,
          retry_after: placesData.retry_after,
          remediation: placesData.remediation,
          inserted: 0,
          enriched: [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    // Dedupe ne bloque jamais l'enrichissement : tous les IDs touchés sont cascadés
    const touchedIds: string[] = placesData.touched_ids ?? placesData.inserted_ids ?? [];
    const enriched: Array<{ id: string; ok: boolean; error?: string }> = [];

    if (enrich && touchedIds.length > 0) {
      const batchSize = 3;
      for (let i = 0; i < touchedIds.length; i += batchSize) {
        const batch = touchedIds.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map((id) =>
            fetch(`${supabaseUrl}/functions/v1/acq-enrich-contractor`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({ prospect_id: id }),
            }).then(async (r) => ({ id, ok: r.ok, status: r.status, body: await r.text() })),
          ),
        );

        for (const r of results) {
          if (r.status === "fulfilled") {
            enriched.push({ id: r.value.id, ok: r.value.ok, error: r.value.ok ? undefined : r.value.body.slice(0, 120) });
          } else {
            enriched.push({ id: "?", ok: false, error: String(r.reason).slice(0, 120) });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        trade,
        city,
        places: {
          found: placesData.found,
          inserted: placesData.inserted,
          enriched_existing: placesData.enriched_existing,
          possible_duplicate: placesData.possible_duplicate,
          skipped_duplicate: placesData.skipped_duplicate,
          failed_extraction: placesData.failed_extraction,
        },
        enriched: {
          attempted: enriched.length,
          succeeded: enriched.filter((e) => e.ok).length,
          failed: enriched.filter((e) => !e.ok).length,
        },
        details: enriched,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
