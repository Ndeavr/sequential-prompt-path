import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

const HEAT_WEIGHTS: Record<string, number> = {
  email_sent: 0,
  sms_sent: 0,
  email_open: 5,
  click: 15,
  page_view: 10,
  outreach_page_viewed: 10,
  identity_confirmed: 15,
  audit_started: 20,
  audit_completed: 20,
  recommendation_viewed: 10,
  checkout_started: 25,
  checkout_completed: 30,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const targetId: string | null = body.targetId || null;

    let query = supabase.from("sniper_engagement_events").select("sniper_target_id, event_name");
    if (targetId) query = query.eq("sniper_target_id", targetId);

    const { data: events } = await query;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate by target
    const heatMap = new Map<string, number>();
    for (const e of events) {
      const w = HEAT_WEIGHTS[e.event_name] || 0;
      heatMap.set(e.sniper_target_id, (heatMap.get(e.sniper_target_id) || 0) + w);
    }

    let updated = 0;
    for (const [tid, heat] of heatMap) {
      const tags = heat >= 70 ? ["close_now"] : heat >= 40 ? ["hot"] : [];
      await supabase.from("sniper_targets").update({
        heat_score: Math.min(heat, 100),
        tags,
        updated_at: new Date().toISOString(),
      }).eq("id", tid);
      updated++;
    }

    return new Response(JSON.stringify({ updated, targets: Object.fromEntries(heatMap) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
