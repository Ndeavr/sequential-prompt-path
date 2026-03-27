import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check — admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Average response latency
    const { data: latencyData } = await adminSupabase
      .from("alex_response_latency")
      .select("latency_ms, is_sla_respected")
      .order("created_at", { ascending: false })
      .limit(500);

    const avgLatency = latencyData?.length
      ? Math.round(latencyData.reduce((sum: number, r: any) => sum + r.latency_ms, 0) / latencyData.length)
      : 0;
    const slaRate = latencyData?.length
      ? Math.round((latencyData.filter((r: any) => r.is_sla_respected).length / latencyData.length) * 100)
      : 100;

    // 2. Session counts
    const { count: totalSessions } = await adminSupabase
      .from("alex_sessions")
      .select("id", { count: "exact", head: true });

    const { count: guestConverted } = await adminSupabase
      .from("alex_sessions")
      .select("id", { count: "exact", head: true })
      .eq("auth_state", "authenticated")
      .not("session_token", "is", null);

    // 3. Top intents
    const { data: intents } = await adminSupabase
      .from("alex_intents")
      .select("detected_intent")
      .order("created_at", { ascending: false })
      .limit(500);

    const intentCounts: Record<string, number> = {};
    (intents || []).forEach((i: any) => {
      intentCounts[i.detected_intent] = (intentCounts[i.detected_intent] || 0) + 1;
    });

    // 4. Top objections
    const { data: objections } = await adminSupabase
      .from("alex_soft_objections")
      .select("objection_type")
      .order("created_at", { ascending: false })
      .limit(200);

    const objectionCounts: Record<string, number> = {};
    (objections || []).forEach((o: any) => {
      objectionCounts[o.objection_type] = (objectionCounts[o.objection_type] || 0) + 1;
    });

    // 5. No result rate
    const { count: noResultCount } = await adminSupabase
      .from("alex_no_result_events")
      .select("id", { count: "exact", head: true });

    // 6. Calendar open rate (actions with open_calendar)
    const { count: calendarOpens } = await adminSupabase
      .from("alex_actions")
      .select("id", { count: "exact", head: true })
      .eq("action_type", "open_calendar");

    // 7. UI failures count
    const { count: uiFailures } = await adminSupabase
      .from("alex_ui_failures")
      .select("id", { count: "exact", head: true });

    return new Response(JSON.stringify({
      avg_response_latency_ms: avgLatency,
      sla_respect_rate: slaRate,
      total_sessions: totalSessions || 0,
      guest_sessions_converted: guestConverted || 0,
      calendar_opens: calendarOpens || 0,
      no_result_events: noResultCount || 0,
      ui_failures: uiFailures || 0,
      top_intents: Object.entries(intentCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([intent, count]) => ({ intent, count })),
      top_objections: Object.entries(objectionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count })),
      no_result_rate: totalSessions
        ? Math.round(((noResultCount || 0) / totalSessions) * 100)
        : 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("alex-admin-analytics error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
