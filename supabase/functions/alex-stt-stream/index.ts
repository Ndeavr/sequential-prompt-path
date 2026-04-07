import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * alex-stt-stream — Google Cloud Speech-to-Text endpoint for fr-CA.
 * Tries V2 first (Chirp 2), falls back to V1 if permission denied.
 * Accepts base64-encoded audio and returns transcript with confidence.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_CLOUD_STT_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_CLOUD_STT_API_KEY not configured");
    }

    const { audio_base64, locale, phrase_boosts } = await req.json();

    if (!audio_base64) {
      return new Response(JSON.stringify({ error: "audio_base64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try V2 first, fallback to V1
    let result = await tryV2(apiKey, audio_base64, locale, phrase_boosts);
    if (result.fallback) {
      console.log("[alex-stt-stream] V2 failed, falling back to V1");
      result = await tryV1(apiKey, audio_base64, locale, phrase_boosts);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.error ? 502 : 200,
    });
  } catch (e) {
    console.error("[alex-stt-stream] Error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** V2 API — Chirp 2 with adaptation */
async function tryV2(
  apiKey: string,
  audio_base64: string,
  locale?: string,
  phrase_boosts?: { phrase: string; boost: number }[]
) {
  const phraseSet = (phrase_boosts || []).map((p) => ({
    value: p.phrase,
    boost: p.boost || 10,
  }));

  const recognitionConfig: Record<string, unknown> = {
    autoDecodingConfig: {},
    languageCodes: [locale || "fr-CA"],
    model: "chirp_2",
    features: {
      enableAutomaticPunctuation: true,
      enableWordConfidence: true,
    },
  };

  if (phraseSet.length > 0) {
    recognitionConfig.adaptation = {
      phraseSets: [{ phrases: phraseSet }],
    };
  }

  const url = `https://speech.googleapis.com/v2/projects/-/locations/global/recognizers/_:recognize?key=${apiKey}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: recognitionConfig, content: audio_base64 }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error("[alex-stt-stream] V2 error:", resp.status, body);
      if (resp.status === 403 || resp.status === 401) {
        return { fallback: true };
      }
      return { error: "STT V2 error", status: resp.status, details: body };
    }

    return extractResult(await resp.json(), locale, "chirp_2");
  } catch (e) {
    console.error("[alex-stt-stream] V2 fetch error:", e);
    return { fallback: true };
  }
}

/** V1 API — standard model, wider API key compatibility */
async function tryV1(
  apiKey: string,
  audio_base64: string,
  locale?: string,
  phrase_boosts?: { phrase: string; boost: number }[]
) {
  const speechContexts = phrase_boosts?.length
    ? [{ phrases: phrase_boosts.map((p) => p.phrase), boost: 15 }]
    : [];

  const body = {
    config: {
      encoding: "WEBM_OPUS",
      languageCode: locale || "fr-CA",
      enableAutomaticPunctuation: true,
      enableWordConfidence: true,
      model: "latest_long",
      speechContexts,
    },
    audio: { content: audio_base64 },
  };

  const url = `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errorBody = await resp.text();
    console.error("[alex-stt-stream] V1 error:", resp.status, errorBody);
    return { error: "STT V1 error", status: resp.status, details: errorBody };
  }

  return extractResult(await resp.json(), locale, "latest_long");
}

/** Extract transcript from either V1 or V2 response */
function extractResult(
  data: Record<string, unknown>,
  locale?: string,
  model?: string
) {
  const results = (data.results || []) as Array<{
    alternatives?: Array<{
      transcript?: string;
      confidence?: number;
      words?: Array<{ word: string; confidence?: number }>;
    }>;
  }>;

  let transcript = "";
  let confidence = 0;
  const wordConfidences: { word: string; confidence: number }[] = [];

  for (const result of results) {
    const alt = result.alternatives?.[0];
    if (alt) {
      transcript += (alt.transcript || "") + " ";
      confidence = Math.max(confidence, alt.confidence || 0);
      if (alt.words) {
        for (const w of alt.words) {
          wordConfidences.push({ word: w.word, confidence: w.confidence || 0 });
        }
      }
    }
  }

  return {
    transcript: transcript.trim(),
    confidence,
    locale: locale || "fr-CA",
    word_confidences: wordConfidences,
    model: model || "unknown",
  };
}
