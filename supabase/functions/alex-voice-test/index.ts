/**
 * alex-voice-test — Test a voice profile with the real TTS pipeline.
 * Same path as production, not a separate demo.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_PHRASES: Record<string, string> = {
  fr: "Oui, je vous écoute. Comment puis-je vous aider?",
  en: "Yes, I'm listening. How can I help you?",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const { profile_key, language, test_text } = await req.json();

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

    const voiceId = profile?.voice_id_primary || "FGY2WhTYpPnrIDTdsKH5";
    const text = test_text || DEFAULT_PHRASES[language || "fr"] || DEFAULT_PHRASES.fr;

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
            stability: profile?.stability ?? 0.65,
            similarity_boost: profile?.similarity_boost ?? 0.80,
            style: profile?.style_exaggeration ?? 0.08,
            use_speaker_boost: true,
            speed: profile?.speech_rate ?? 1.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `ElevenLabs ${response.status}`, details: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "X-Voice-Id": voiceId,
        "X-Profile-Key": profile_key || "homeowner",
      },
    });
  } catch (e) {
    console.error("alex-voice-test error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
