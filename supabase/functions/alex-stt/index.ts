/**
 * alex-stt — Reliable Speech-to-Text with French language forcing and CJK rejection.
 * 
 * Uses Google Cloud STT V2 (Chirp 2) with V1 fallback.
 * Forces fr-CA. Rejects corrupted transcripts (CJK, empty, parenthetical noise).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// CJK detection regex
const CJK_REGEX = /[\u3000-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\u3040-\u309F\u30A0-\u30FF]/;
// Parenthetical noise like (bruit), (musique), (rires)
const NOISE_REGEX = /^\s*\([^)]*\)\s*$/;
// Minimum meaningful transcript length
const MIN_TRANSCRIPT_LENGTH = 2;

interface TranscriptResult {
  success: boolean;
  transcript: string;
  detected_language: string;
  confidence: number;
  rejected: boolean;
  rejected_reason: string | null;
  error_code: string | null;
  model_used: string;
}

function validateTranscript(text: string): { valid: boolean; reason: string | null } {
  if (!text || text.trim().length < MIN_TRANSCRIPT_LENGTH) {
    return { valid: false, reason: "transcript_too_short" };
  }
  if (CJK_REGEX.test(text)) {
    return { valid: false, reason: "cjk_characters_detected" };
  }
  if (NOISE_REGEX.test(text.trim())) {
    return { valid: false, reason: "noise_only_transcript" };
  }
  return { valid: true, reason: null };
}

async function trySTTV2(
  apiKey: string,
  audioBase64: string,
  locale: string
): Promise<{ transcript: string; confidence: number; fallback?: boolean; error?: string; status?: number }> {
  const url = `https://speech.googleapis.com/v2/projects/-/locations/global/recognizers/_:recognize?key=${apiKey}`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          autoDecodingConfig: {},
          languageCodes: [locale],
          model: "chirp_2",
          features: { enableAutomaticPunctuation: true, enableWordConfidence: true },
        },
        content: audioBase64,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      if (resp.status === 403 || resp.status === 401) return { transcript: "", confidence: 0, fallback: true };
      return { transcript: "", confidence: 0, error: body, status: resp.status };
    }

    const data = await resp.json();
    return extractTranscript(data);
  } catch (e) {
    return { transcript: "", confidence: 0, fallback: true };
  }
}

async function trySTTV1(
  apiKey: string,
  audioBase64: string,
  locale: string
): Promise<{ transcript: string; confidence: number; error?: string; status?: number }> {
  const url = `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config: {
        encoding: "WEBM_OPUS",
        languageCode: locale,
        enableAutomaticPunctuation: true,
        model: "latest_long",
      },
      audio: { content: audioBase64 },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    return { transcript: "", confidence: 0, error: body, status: resp.status };
  }

  return extractTranscript(await resp.json());
}

function extractTranscript(data: any): { transcript: string; confidence: number } {
  const results = (data.results || []) as any[];
  let transcript = "";
  let confidence = 0;
  for (const r of results) {
    const alt = r.alternatives?.[0];
    if (alt) {
      transcript += (alt.transcript || "") + " ";
      confidence = Math.max(confidence, alt.confidence || 0);
    }
  }
  return { transcript: transcript.trim(), confidence };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GOOGLE_CLOUD_STT_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({
        success: false,
        error_code: "stt_key_missing",
        transcript: "",
        rejected: true,
        rejected_reason: "GOOGLE_CLOUD_STT_API_KEY not configured",
      } as Partial<TranscriptResult>), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { audio_base64, locale, voice_session_id } = await req.json();
    if (!audio_base64) {
      return new Response(JSON.stringify({ success: false, error_code: "no_audio", transcript: "" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const forcedLocale = locale || "fr-CA";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try V2 then V1
    let modelUsed = "chirp_2";
    let sttResult = await trySTTV2(apiKey, audio_base64, forcedLocale);

    if (sttResult.fallback) {
      console.log("[alex-stt] V2 failed, falling back to V1");
      modelUsed = "latest_long";
      sttResult = await trySTTV1(apiKey, audio_base64, forcedLocale);
    }

    if (sttResult.error) {
      // Log STT error
      if (voice_session_id) {
        await supabase.from("voice_reliability_errors").insert({
          voice_session_id,
          provider_name: "google_cloud_stt",
          module_name: "alex-stt",
          error_code: `http_${sttResult.status}`,
          error_message: sttResult.error?.slice(0, 500),
          http_status: sttResult.status,
          retryable: true,
          fallback_applied: false,
        }).catch(() => {});
      }

      return new Response(JSON.stringify({
        success: false,
        transcript: "",
        detected_language: forcedLocale,
        confidence: 0,
        rejected: true,
        rejected_reason: "stt_provider_error",
        error_code: `stt_error_${sttResult.status}`,
        model_used: modelUsed,
      } satisfies TranscriptResult), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate transcript
    const validation = validateTranscript(sttResult.transcript);

    // Log transcript
    if (voice_session_id) {
      await supabase.from("voice_reliability_transcripts").insert({
        voice_session_id,
        speaker_role: "user",
        raw_transcript: sttResult.transcript,
        normalized_transcript: validation.valid ? sttResult.transcript : null,
        detected_language: forcedLocale,
        confidence_score: sttResult.confidence,
        rejected: !validation.valid,
        rejected_reason: validation.reason,
      }).catch(() => {});

      await supabase.from("voice_reliability_events").insert({
        voice_session_id,
        event_type: validation.valid ? "stt_succeeded" : "stt_rejected",
        event_source: "edge",
        payload_json: {
          model: modelUsed,
          confidence: sttResult.confidence,
          rejected_reason: validation.reason,
          transcript_length: sttResult.transcript.length,
        },
      }).catch(() => {});
    }

    return new Response(JSON.stringify({
      success: validation.valid,
      transcript: validation.valid ? sttResult.transcript : "",
      detected_language: forcedLocale,
      confidence: sttResult.confidence,
      rejected: !validation.valid,
      rejected_reason: validation.reason,
      error_code: null,
      model_used: modelUsed,
    } satisfies TranscriptResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[alex-stt] Error:", e);
    return new Response(JSON.stringify({
      success: false,
      error_code: "internal_error",
      transcript: "",
      rejected: true,
      rejected_reason: e instanceof Error ? e.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
