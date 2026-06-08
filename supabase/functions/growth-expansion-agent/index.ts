// UNPRO — Growth Expansion Agent
// Finds local competitors for an activated contractor via Google Maps Places API (New).
// Inserts contractor_competitors and creates/updates a contractor_growth_campaigns row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { reportOutcome, FailureCode } from "../_shared/reliability.ts";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

interface Input {
  contractor_id: string;
  trade?: string | null;
  city?: string | null;
  limit?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GMAPS_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = (await req.json().catch(() => ({}))) as Input;
    if (!body.contractor_id) {
      return new Response(JSON.stringify({ error: "contractor_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LOVABLE_KEY || !GMAPS_KEY) {
      await reportOutcome({
        operation: "growth_expansion", outcome: "failed",
        failure_code: FailureCode.MISSING_SECRET, affected_record: body.contractor_id,
      });
      return new Response(JSON.stringify({ error: "missing_google_maps_credentials" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load contractor if trade/city missing
    let { trade, city } = body;
    if (!trade || !city) {
      const { data: c } = await sb.from("contractors")
        .select("specialty, city").eq("id", body.contractor_id).maybeSingle();
      trade = trade ?? c?.specialty ?? null;
      city = city ?? c?.city ?? null;
    }
    if (!trade || !city) {
      return new Response(JSON.stringify({ error: "trade_or_city_missing" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure a campaign row exists
    let { data: campaign } = await sb.from("contractor_growth_campaigns")
      .select("id, targets_found")
      .eq("contractor_id", body.contractor_id).eq("trade", trade).eq("city", city)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (!campaign) {
      const ins = await sb.from("contractor_growth_campaigns")
        .insert({ contractor_id: body.contractor_id, trade, city, status: "running" })
        .select("id, targets_found").single();
      campaign = ins.data!;
    } else {
      await sb.from("contractor_growth_campaigns").update({ status: "running" }).eq("id", campaign.id);
    }

    // Google Places text search via gateway
    const textQuery = `${trade} ${city} Québec`;
    const fields = "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount";
    const limit = Math.min(body.limit ?? 50, 50);

    const resp = await fetch(`${GATEWAY}/places/v1/places:searchText`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_KEY}`,
        "X-Connection-Api-Key": GMAPS_KEY,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": fields,
      },
      body: JSON.stringify({ textQuery, maxResultCount: limit, languageCode: "fr-CA", regionCode: "CA" }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      await reportOutcome({
        operation: "growth_expansion", outcome: "failed",
        failure_code: FailureCode.ENRICHMENT_FAILED,
        affected_record: body.contractor_id,
        payload: { http: resp.status, body: errText.slice(0, 500) },
      });
      return new Response(JSON.stringify({ error: "places_api_error", detail: errText.slice(0, 500) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const places: Array<Record<string, unknown>> = (data.places ?? []) as Array<Record<string, unknown>>;

    const rows = places.map((p) => ({
      contractor_id: body.contractor_id,
      competitor_name: ((p.displayName as { text?: string } | undefined)?.text) ?? "—",
      trade,
      city,
      website: (p.websiteUri as string | undefined) ?? null,
      phone: (p.nationalPhoneNumber as string | undefined) ?? null,
      google_rating: (p.rating as number | undefined) ?? null,
      review_count: (p.userRatingCount as number | undefined) ?? null,
      status: "waiting_review",
    }));

    let inserted = 0;
    if (rows.length) {
      const { error, count } = await sb.from("contractor_competitors")
        .insert(rows, { count: "exact" });
      if (error) {
        await reportOutcome({
          operation: "growth_expansion", outcome: "failed",
          failure_code: FailureCode.SUPABASE_TIMEOUT,
          affected_record: body.contractor_id, payload: { error: error.message },
        });
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted = count ?? rows.length;
    }

    await sb.from("contractor_growth_campaigns")
      .update({
        targets_found: (campaign.targets_found ?? 0) + inserted,
        status: inserted > 0 ? "waiting_review" : "failed",
      })
      .eq("id", campaign.id);

    await reportOutcome({
      operation: "growth_expansion",
      outcome: inserted > 0 ? "achieved" : "blocked",
      failure_code: inserted > 0 ? null : FailureCode.SCOUT_NO_RESULTS,
      affected_record: body.contractor_id,
      payload: { trade, city, inserted },
    });

    return new Response(JSON.stringify({ ok: true, inserted, campaign_id: campaign.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await reportOutcome({
      operation: "growth_expansion", outcome: "failed",
      failure_code: FailureCode.UNKNOWN, payload: { error: msg },
    });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
