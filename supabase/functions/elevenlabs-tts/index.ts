import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";
import { ALEX_VOICE_CONFIG, getAlexVoiceSettings, type AlexVoiceProfile } from "../_shared/alex-french-voice.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    const { text, voiceProfile, locale } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply DB pronunciation rules before TTS
    let processedText = text;
    try {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const ruleLocale = locale || "fr-CA";
      const { data: rules } = await sb
        .from("alex_voice_pronunciation_rules")
        .select("source_text, replacement_text, phonetic_override")
        .eq("is_active", true)
        .or(`locale.eq.${ruleLocale},locale.eq.global`)
        .order("priority", { ascending: false });

      if (rules?.length) {
        for (const rule of rules) {
          const escaped = rule.source_text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(`\\b${escaped}\\b`, "gi");
          const replacement = rule.phonetic_override || rule.replacement_text;
          processedText = processedText.replace(regex, replacement);
        }
      }
    } catch (e) {
      console.warn("Pronunciation rules fetch failed, using raw text:", e);
    }

    // Always use locked Alex voice — no fallback
    const { voiceId, modelId, outputFormat, chunkLengthSchedule } = ALEX_VOICE_CONFIG;
    const voiceSettings = voiceProfile
      ? getAlexVoiceSettings(voiceProfile as AlexVoiceProfile)
      : ALEX_VOICE_CONFIG.voiceSettings;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: processedText,
          model_id: modelId,
          voice_settings: voiceSettings,
          chunk_length_schedule: chunkLengthSchedule,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Erreur du service vocal" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (e) {
    console.error("TTS error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
