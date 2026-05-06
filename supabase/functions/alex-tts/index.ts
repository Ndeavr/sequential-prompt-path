/**
 * alex-tts — Reliable TTS with automatic fallback.
 * 
 * Primary: voice XB0fDUnXU5powFXDhCwa (Alex premium female — Charlotte FR+EN)
 * Fallback: voice XB0fDUnXU5powFXDhCwa (same — single locked voice)
 * 
 * Returns raw audio/mpeg with headers indicating active provider.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIMARY_VOICE_ID = "XB0fDUnXU5powFXDhCwa";  // Charlotte — Alex premium female
const FALLBACK_VOICE_ID = "XB0fDUnXU5powFXDhCwa";
const MODEL_ID = "eleven_multilingual_v2";

const FALLBACK_TRIGGER_ERRORS = [
  "voice_limit_reached",
  "voice_not_found",
  "unauthorized",
  "quota_exceeded",
  "invalid_api_key",
];

async function callElevenLabs(
  apiKey: string,
  voiceId: string,
  text: string,
  settings: Record<string, unknown>
): Promise<{ ok: boolean; audio?: ArrayBuffer; status?: number; errorBody?: string }> {
  try {
    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: {
            stability: (settings.stability as number) ?? 0.5,
            similarity_boost: (settings.similarity_boost as number) ?? 0.75,
            style: (settings.style as number) ?? 0.4,
            use_speaker_boost: true,
            speed: (settings.speed as number) ?? 1.0,
          },
        }),
      }
    );

    if (!resp.ok) {
      const body = await resp.text();
      return { ok: false, status: resp.status, errorBody: body };
    }

    return { ok: true, audio: await resp.arrayBuffer() };
  } catch (e) {
    return { ok: false, status: 0, errorBody: e instanceof Error ? e.message : "fetch_error" };
  }
}

function shouldFallback(errorBody: string): boolean {
  const lower = errorBody.toLowerCase();
  return FALLBACK_TRIGGER_ERRORS.some((e) => lower.includes(e));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, voice_session_id, settings } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const voiceSettings = settings || {};
    let activeVoiceId = PRIMARY_VOICE_ID;
    let fallbackUsed = false;
    let fallbackReason: string | null = null;

    // Try primary
    let result = await callElevenLabs(ELEVENLABS_API_KEY, PRIMARY_VOICE_ID, text, voiceSettings);

    if (!result.ok && shouldFallback(result.errorBody || "")) {
      // Log primary failure
      fallbackReason = result.errorBody?.slice(0, 200) || "unknown";
      console.warn(`[alex-tts] Primary voice failed (${result.status}), trying fallback`);

      if (voice_session_id) {
        await supabase.from("voice_reliability_errors").insert({
          voice_session_id,
          provider_name: "elevenlabs_primary",
          module_name: "alex-tts",
          error_code: `http_${result.status}`,
          error_message: fallbackReason,
          http_status: result.status,
          retryable: true,
          fallback_applied: true,
        }).catch(() => {});
      }

      // Try fallback
      result = await callElevenLabs(ELEVENLABS_API_KEY, FALLBACK_VOICE_ID, text, voiceSettings);
      activeVoiceId = FALLBACK_VOICE_ID;
      fallbackUsed = true;
    }

    if (!result.ok) {
      // Both failed
      if (voice_session_id) {
        await supabase.from("voice_reliability_errors").insert({
          voice_session_id,
          provider_name: fallbackUsed ? "elevenlabs_fallback" : "elevenlabs_primary",
          module_name: "alex-tts",
          error_code: `http_${result.status}`,
          error_message: result.errorBody?.slice(0, 500) || "unknown",
          http_status: result.status,
          retryable: false,
          fallback_applied: fallbackUsed,
        }).catch(() => {});
      }

      // Return 200 with fallback signal so client doesn't crash; client falls back silently.
      return new Response(JSON.stringify({
        error: "tts_unavailable",
        message: "Aucun service vocal disponible",
        fallback_attempted: fallbackUsed,
        fallback: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log success event
    if (voice_session_id) {
      await supabase.from("voice_reliability_events").insert({
        voice_session_id,
        event_type: fallbackUsed ? "tts_fallback_used" : "tts_succeeded",
        event_source: "edge",
        payload_json: {
          voice_id: activeVoiceId,
          fallback_used: fallbackUsed,
          fallback_reason: fallbackReason,
          text_length: text.length,
        },
      }).catch(() => {});
    }

    return new Response(result.audio!, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "X-Alex-Voice-Id": activeVoiceId,
        "X-Alex-Fallback-Used": String(fallbackUsed),
        "X-Alex-Provider": "elevenlabs",
      },
    });
  } catch (e) {
    console.error("[alex-tts] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
