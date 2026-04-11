/**
 * alex-voice-health — Health check for all voice providers.
 * Returns status of ElevenLabs TTS, Google STT, and secret availability.
 * Never exposes secret values.
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const checks: Record<string, { status: string; detail?: string }> = {};

    // 1. Check ELEVENLABS_API_KEY
    const elevenKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elevenKey) {
      checks.elevenlabs_key = { status: "missing", detail: "ELEVENLABS_API_KEY not configured" };
    } else {
      // Quick validate by listing voices (cheap endpoint)
      try {
        const resp = await fetch("https://api.elevenlabs.io/v1/user", {
          headers: { "xi-api-key": elevenKey },
        });
        if (resp.ok) {
          checks.elevenlabs_key = { status: "valid" };
        } else {
          const body = await resp.text();
          checks.elevenlabs_key = { status: "invalid", detail: `HTTP ${resp.status}` };
        }
      } catch {
        checks.elevenlabs_key = { status: "error", detail: "Network error" };
      }
    }

    // 2. Check GOOGLE_CLOUD_STT_API_KEY
    const googleKey = Deno.env.get("GOOGLE_CLOUD_STT_API_KEY");
    if (!googleKey) {
      checks.google_stt_key = { status: "missing", detail: "GOOGLE_CLOUD_STT_API_KEY not configured" };
    } else {
      checks.google_stt_key = { status: "present" };
    }

    // 3. Check LOVABLE_API_KEY (for Gemini Live)
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    checks.lovable_ai_key = lovableKey ? { status: "present" } : { status: "missing" };

    // 4. Recent error rate (24h)
    const { count: errorCount } = await supabase
      .from("voice_reliability_errors")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { count: sessionCount } = await supabase
      .from("voice_reliability_sessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // 5. Recent fallback rate
    const { count: fallbackCount } = await supabase
      .from("voice_reliability_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "tts_fallback_used")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const overall = Object.values(checks).every((c) => c.status === "valid" || c.status === "present")
      ? "healthy"
      : Object.values(checks).some((c) => c.status === "missing")
      ? "degraded"
      : "unhealthy";

    return new Response(JSON.stringify({
      status: overall,
      checks,
      metrics_24h: {
        total_sessions: sessionCount || 0,
        total_errors: errorCount || 0,
        fallback_uses: fallbackCount || 0,
        error_rate: sessionCount ? ((errorCount || 0) / sessionCount * 100).toFixed(1) + "%" : "N/A",
      },
      checked_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[alex-voice-health] Error:", e);
    return new Response(JSON.stringify({ status: "error", error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
