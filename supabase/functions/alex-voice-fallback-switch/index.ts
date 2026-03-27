import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { voice_session_id, from_provider, reason } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get current session
    const { data: session } = await supabase
      .from("alex_voice_sessions")
      .select("*")
      .eq("id", voice_session_id)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: "Voice session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine next provider in fallback chain
    const chain = ["openai_realtime", "gemini_live", "hybrid", "tts_only", "text_only"];
    const currentIdx = chain.indexOf(from_provider);
    const toProvider = chain.find((p, i) => i > currentIdx && p !== from_provider) || "text_only";

    const newMode = toProvider === "text_only" ? "text_only" :
                    toProvider === "tts_only" ? "tts_only" :
                    toProvider === "hybrid" ? "hybrid" : "realtime_native";

    // Update session
    await supabase
      .from("alex_voice_sessions")
      .update({
        provider_current: toProvider,
        connection_mode: newMode,
      })
      .eq("id", voice_session_id);

    // Log fallback event
    await supabase.from("alex_voice_fallback_events").insert({
      voice_session_id,
      from_provider,
      to_provider: toProvider,
      reason: reason || "provider_failure",
      was_user_visible: true,
    });

    // Log provider event
    await supabase.from("alex_voice_provider_events").insert({
      voice_session_id,
      provider_name: from_provider,
      event_type: "fallback_triggered",
      event_status: "completed",
      payload: { reason, to_provider: toProvider },
    });

    return new Response(JSON.stringify({
      new_provider: toProvider,
      connection_mode: newMode,
      fallback_chain_remaining: chain.filter((p, i) => i > chain.indexOf(toProvider)),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("alex-voice-fallback-switch error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
