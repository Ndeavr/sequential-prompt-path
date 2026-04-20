// Female premium TTS for the Nuclear Close landing.
// Uses ElevenLabs Charlotte (FR) / Sarah (EN). Returns MP3 bytes.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VOICE_FR = "XB0fDUnXU5powFXDhCwa"; // Charlotte
const VOICE_EN = "EXAVITQu4vr4xnSDxMaL"; // Sarah

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, language = "fr" } = (await req.json()) as {
      text: string;
      language?: "fr" | "en";
    };

    if (!text || text.length > 1500) {
      return new Response(
        JSON.stringify({ error: "text required (≤1500 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const voiceId = language === "en" ? VOICE_EN : VOICE_FR;

    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.78,
            style: 0.35,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      }
    );

    if (!ttsRes.ok || !ttsRes.body) {
      const errText = await ttsRes.text();
      console.error("[pro-landing-tts] ElevenLabs error", ttsRes.status, errText);
      return new Response(
        JSON.stringify({ error: `ElevenLabs ${ttsRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(ttsRes.body, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("[pro-landing-tts] fatal", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
