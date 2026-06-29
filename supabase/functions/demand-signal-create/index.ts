// UNPRO Demand Intelligence — Create demand signal from a homeowner project
// Idempotent on project_id. Returns waiting position + market context.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      project_id,
      homeowner_id,
      city,
      category,
      subcategory = null,
      postal_code = null,
      estimated_project_value = 0,
      estimated_ltv = 0,
      urgency_score = 5,
      notify_channels = { sms: true, email: true, push: true },
      metadata = {},
    } = body ?? {};

    if (!project_id || !homeowner_id || !city || !category) {
      return json({ ok: false, error: "missing_fields" }, 400);
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalizedCity = String(city).trim();
    const normalizedCategory = String(category).trim().toLowerCase();

    // Idempotent upsert on project_id
    const { data: existing } = await sb
      .from("demand_signals")
      .select("id, position_in_queue, status")
      .eq("project_id", project_id)
      .maybeSingle();

    let signalId = existing?.id;

    if (!signalId) {
      const { data: ins, error: insErr } = await sb
        .from("demand_signals")
        .insert({
          project_id,
          homeowner_id,
          city: normalizedCity,
          category: normalizedCategory,
          subcategory,
          postal_code,
          estimated_project_value,
          estimated_ltv,
          urgency_score,
          notify_channels,
          metadata,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      signalId = ins.id;
    }

    // Refreshed by trigger — re-read for position + market context
    const { data: signal } = await sb
      .from("demand_signals")
      .select("id, position_in_queue, status, matched_contractor_id, city, category")
      .eq("id", signalId!)
      .single();

    const { data: market } = await sb
      .from("market_demand")
      .select("homeowner_count, supply_count, gap_score, pressure_score, estimated_revenue")
      .eq("city", normalizedCity)
      .eq("category", normalizedCategory)
      .maybeSingle();

    const { data: target } = await sb
      .from("contractor_recruitment_targets")
      .select("landing_slug, status")
      .eq("city", normalizedCity)
      .eq("category", normalizedCategory)
      .maybeSingle();

    // Telemetry
    await sb.from("acquisition_events").insert({
      event_type: "demand_signal.created",
      payload: {
        signal_id: signalId,
        city: normalizedCity,
        category: normalizedCategory,
        position: signal?.position_in_queue,
        has_supply: (market?.supply_count ?? 0) > 0,
      },
    }).catch(() => {});

    return json({
      ok: true,
      signal,
      market,
      recruitment_target: target,
      has_match_path: (market?.supply_count ?? 0) > 0,
    });
  } catch (e) {
    console.error("demand-signal-create error", e);
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
