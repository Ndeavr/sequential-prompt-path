/**
 * edge_log_score_reveal_event — Logs reveal events for analytics.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sessionId, eventKey, eventValue, metadata } = await req.json();

    if (!sessionId || !eventKey) {
      return new Response(JSON.stringify({ error: "sessionId and eventKey required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("alex_score_reveal_events").insert({
      session_id: sessionId,
      event_key: eventKey,
      event_value: eventValue || null,
      metadata: metadata || {},
    });

    if (error) throw error;

    // Update session last_active_at
    await supabase.from("alex_score_reveal_sessions")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", sessionId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
