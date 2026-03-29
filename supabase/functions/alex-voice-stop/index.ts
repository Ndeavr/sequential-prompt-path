/**
 * alex-voice-stop — Stop/interrupt active voice session.
 * Logs the interruption event for debugging.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { runtime_session_id, reason } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log stop event
    await supabase.from("alex_voice_events").insert({
      runtime_session_id: runtime_session_id || null,
      event_type: "voice_stop",
      event_status: "completed",
      payload: { reason: reason || "user_interrupt", timestamp: new Date().toISOString() },
    });

    // Update runtime session if provided
    if (runtime_session_id) {
      await supabase
        .from("alex_voice_runtime_sessions")
        .update({
          runtime_state: "idle",
          is_playing: false,
          last_interrupt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", runtime_session_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("alex-voice-stop error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
