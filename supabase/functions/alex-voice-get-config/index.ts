import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile_key, language } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("alex_voice_profiles")
      .select("*")
      .eq("profile_key", profile_key || "homeowner")
      .eq("language", language || "fr")
      .eq("is_active", true)
      .single();

    if (error || !data) {
      // Fallback defaults
      return new Response(JSON.stringify({
        provider: "elevenlabs",
        voiceId: "mVjOqyqTPfwlXPjV5sjX",
        locale: "fr-QC",
        toneStyle: "premium_calm",
        speechRate: 1.0,
        accentTarget: "quebec_premium_neutral",
        interruptibility: true,
        stability: 0.65,
        similarityBoost: 0.80,
        styleExaggeration: 0.08,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      provider: data.provider_primary,
      voiceId: data.voice_id_primary,
      locale: data.locale_code,
      toneStyle: data.tone_style,
      speechRate: data.speech_rate,
      accentTarget: data.accent_target,
      interruptibility: data.interruptibility,
      stability: data.stability,
      similarityBoost: data.similarity_boost,
      styleExaggeration: data.style_exaggeration,
      displayName: data.voice_display_name,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("alex-voice-get-config error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
