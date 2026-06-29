// UNPRO Demand Intelligence — Periodic refresh of recruitment targets.
// Recomputes priority_score and archives stale targets. Cron: */15 * * * *.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: segments } = await sb
      .from("market_demand")
      .select("city, category");

    let refreshed = 0;
    for (const s of segments ?? []) {
      const { error } = await sb.rpc("fn_refresh_market_demand", {
        _city: s.city,
        _category: s.category,
      });
      if (!error) refreshed++;
    }

    // Archive recruitment targets that have no waiting demand for 14+ days
    const cutoff = new Date(Date.now() - 14 * 86400 * 1000).toISOString();
    const { count: archived } = await sb
      .from("contractor_recruitment_targets")
      .update({ status: "archived" })
      .eq("waiting_count", 0)
      .lt("updated_at", cutoff)
      .neq("status", "archived");

    await sb.from("acquisition_events").insert({
      event_type: "recruitment_target.refreshed",
      payload: { refreshed, archived },
    }).catch(() => {});

    return json({ ok: true, refreshed, archived });
  } catch (e) {
    console.error("recruitment-target-refresh error", e);
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
