/**
 * alex-voice-speak — Single TTS endpoint.
 * Loads voice config from DB (no hardcoded IDs).
 * Returns raw audio/mpeg binary.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const { text, profile_key, language, voice_id: overrideVoiceId } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load voice config from DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabase
      .from("alex_voice_profiles")
      .select("*")
      .eq("profile_key", profile_key || "homeowner")
      .eq("language", language || "fr")
      .eq("is_active", true)
      .single();

    // Use DB config, fallback to defaults
    const voiceId = overrideVoiceId || profile?.voice_id_primary || "FGY2WhTYpPnrIDTdsKH5";
    const stability = profile?.stability ?? 0.65;
    const similarityBoost = profile?.similarity_boost ?? 0.80;
    const style = profile?.style_exaggeration ?? 0.08;
    const speechRate = profile?.speech_rate ?? 1.0;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: true,
            speed: speechRate,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs error:", response.status, errText);

      // Log error to DB
      await supabase.from("alex_voice_errors").insert({
        error_type: "tts_api_error",
        error_message: `ElevenLabs ${response.status}: ${errText.slice(0, 500)}`,
        payload: { voiceId, profile_key, language },
      });

      return new Response(JSON.stringify({ error: "Voice service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await response.arrayBuffer();

    // Log success event
    await supabase.from("alex_voice_events").insert({
      event_type: "tts_success",
      payload: { voiceId, profile_key, language, text_length: text.length },
    });

    return new Response(audioBuffer, {
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
    });
  } catch (e) {
    console.error("alex-voice-speak error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
