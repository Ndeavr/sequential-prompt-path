import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * alex-stt-stream — Google Cloud Speech-to-Text V2 endpoint for fr-CA.
 * Accepts base64-encoded PCM audio and returns transcript with confidence.
 * Uses Chirp 3 model with phrase boosting for Quebec French.
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

    const { audio_base64, locale, phrase_boosts, encoding, sample_rate } = await req.json();

    if (!audio_base64) {
      return new Response(JSON.stringify({ error: "audio_base64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build phrase set for adaptation
    const phraseSet = (phrase_boosts || []).map((p: { phrase: string; boost: number }) => ({
      value: p.phrase,
      boost: p.boost || 10,
    }));

    // Build recognition config for Cloud STT V2
    const recognitionConfig = {
      autoDecodingConfig: {},
      languageCodes: [locale || "fr-CA"],
      model: "chirp_2", // chirp_2 is stable; chirp_3 when available
      features: {
        enableAutomaticPunctuation: true,
        enableWordConfidence: true,
        enableWordTimeOffsets: false,
      },
      adaptation: phraseSet.length > 0 ? {
        phraseSets: [{
          phrases: phraseSet,
        }],
      } : undefined,
    };

    // Call Google Cloud Speech-to-Text V2 Recognize
    const sttUrl = `https://speech.googleapis.com/v2/projects/-/locations/global/recognizers/_:recognize?key=${apiKey}`;

    const sttResponse = await fetch(sttUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: recognitionConfig,
        content: audio_base64,
      }),
    });

    if (!sttResponse.ok) {
      const errorBody = await sttResponse.text();
      console.error("[alex-stt-stream] STT API error:", sttResponse.status, errorBody);
      return new Response(JSON.stringify({ 
        error: "STT API error", 
        status: sttResponse.status,
        details: errorBody 
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sttResult = await sttResponse.json();

    // Extract transcript and confidence
    const results = sttResult.results || [];
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
            wordConfidences.push({
              word: w.word,
              confidence: w.confidence || 0,
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({
      transcript: transcript.trim(),
      confidence,
      locale: locale || "fr-CA",
      word_confidences: wordConfidences,
      model: "chirp_2",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[alex-stt-stream] Error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
