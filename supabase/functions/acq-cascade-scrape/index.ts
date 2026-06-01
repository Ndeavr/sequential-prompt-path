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
      body: JSON.stringify({ trade, city, limit, dry_run: false }),
    });

    const placesData = await placesResp.json();
    if (!placesResp.ok) {
      return new Response(
        JSON.stringify({ step: "google_places", error: placesData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const insertedIds: string[] = placesData.inserted_ids ?? [];
    const enriched: Array<{ id: string; ok: boolean; error?: string }> = [];

    // 2. Firecrawl enrichment cascade (best effort, in parallel batches of 3)
    if (enrich && insertedIds.length > 0) {
      const batchSize = 3;
      for (let i = 0; i < insertedIds.length; i += batchSize) {
        const batch = insertedIds.slice(i, i + batchSize);
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
          skipped: placesData.skipped,
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
