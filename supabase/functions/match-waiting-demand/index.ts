// UNPRO Demand Intelligence — Match waiting demand when a contractor activates
// Triggered by activation webhook or admin "Re-run matching".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const start = Date.now();
  try {
    const { contractor_id } = await req.json();
    if (!contractor_id) return json({ ok: false, error: "contractor_id required" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await sb.rpc("fn_match_waiting_demand", { _contractor_id: contractor_id });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    const matched = row?.matched_count ?? 0;
    const segments = row?.segments ?? [];

    // Notify each newly matched homeowner — best-effort
    if (matched > 0) {
      const { data: signals } = await sb
        .from("demand_signals")
        .select("id, homeowner_id, city, category, project_id, notify_channels")
        .eq("matched_contractor_id", contractor_id)
        .eq("status", "matched")
        .order("updated_at", { ascending: false })
        .limit(200);

      for (const s of signals ?? []) {
        await sb.from("notifications").insert({
          user_id: s.homeowner_id,
          type: "demand_matched",
          title: "Une recommandation est prête",
          body: `Un entrepreneur compatible est maintenant disponible pour votre projet ${s.category} à ${s.city}.`,
          metadata: { signal_id: s.id, contractor_id, project_id: s.project_id },
        }).catch(() => {});
      }
    }

    await sb.from("acquisition_events").insert({
      event_type: "demand_signal.matched",
      payload: { contractor_id, matched_count: matched, segments, duration_ms: Date.now() - start },
    }).catch(() => {});

    return json({ ok: true, matched_count: matched, segments, duration_ms: Date.now() - start });
  } catch (e) {
    console.error("match-waiting-demand error", e);
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
