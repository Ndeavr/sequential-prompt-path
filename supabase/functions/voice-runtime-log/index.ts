/**
 * voice-runtime-log — Logs voice runtime events for observability.
 * Called by the client after each voice session event.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      event_type,
      agent_id_used,
      voice_id_used,
      language,
      fallback_used,
      fallback_reason,
      error_message,
      latency_ms,
      session_id,
      user_id,
      metadata,
    } = body;

    if (!event_type || !agent_id_used) {
      return new Response(
        JSON.stringify({ error: "event_type and agent_id_used required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("voice_runtime_logs").insert({
      event_type,
      agent_id_used,
      voice_id_used: voice_id_used || null,
      language: language || "fr",
      fallback_used: fallback_used || false,
      fallback_reason: fallback_reason || null,
      error_message: error_message || null,
      latency_ms: latency_ms || null,
      session_id: session_id || null,
      user_id: user_id || null,
      metadata: metadata || {},
    });

    if (error) {
      console.error("[voice-runtime-log] insert error:", error.message);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[voice-runtime-log] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
