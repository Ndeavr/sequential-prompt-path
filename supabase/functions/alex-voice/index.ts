/**
 * UNPRO — Alex Voice Edge Function
 * Handles voice conversation: STT via ElevenLabs, AI response via Lovable AI, TTS via ElevenLabs.
 * Supports streaming for low-latency responses.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALEX_SYSTEM_PROMPT = `You are Alex, the UNPRO AI concierge.
ROLE: Guide users through actions after QR scans and deep links.
LANGUAGE: Always respond in French (Québécois natural).
PRINCIPLES:
- Be fast, helpful, and minimal
- Do not overwhelm
- Ask maximum 3 questions before action
- Always move toward action (design, score, booking)
BEHAVIOR:
If user arrives from QR: detect feature intent, greet based on intent, guide toward completion.
If user not logged in: reassure user, explain that progress will resume after login.
If user logs in: resume exact action instantly.
FEATURE MODES:
Kitchen: Guide user to upload photo and choose style
Home Score: Ask property basics, then generate score
Booking: Ask service + city + urgency, then open calendar
TONE: natural, confident, premium, no filler
GOAL: Move user from scan → completion as fast as possible.
Keep responses under 2 sentences. Be direct.`;

const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah - natural FR voice

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, sessionId, feature, userMessage, messages } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ACTION: get-token — Return ElevenLabs conversation token for WebRTC
    if (action === "get-scribe-token") {
      const response = await fetch(
        "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
        {
          method: "POST",
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
        }
      );
      const { token } = await response.json();
      return new Response(JSON.stringify({ token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: respond — Get AI text response then TTS
    if (action === "respond") {
      // Build conversation history
      const conversationMessages = [
        { role: "system", content: ALEX_SYSTEM_PROMPT + (feature ? `\nCurrent feature context: ${feature}` : "") },
        ...(messages || []),
        ...(userMessage ? [{ role: "user", content: userMessage }] : []),
      ];

      // Get AI response via Lovable AI
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: conversationMessages,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI gateway error");
      }

      const aiData = await aiResponse.json();
      const alexText = aiData.choices?.[0]?.message?.content || "Je suis là pour t'aider.";

      // Log voice event
      if (sessionId) {
        await supabase.from("voice_events").insert({
          session_id: sessionId,
          event_type: "ai_response",
          metadata: { text: alexText, feature },
        });
      }

      // Generate TTS via ElevenLabs
      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_22050_32`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: alexText,
            model_id: "eleven_turbo_v2_5",
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.75,
              speed: 1.1,
            },
          }),
        }
      );

      if (!ttsResponse.ok) {
        // Fallback: return text only
        return new Response(JSON.stringify({ text: alexText, audioAvailable: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const audioBuffer = await ttsResponse.arrayBuffer();
      const { encode: base64Encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
      const audioBase64 = base64Encode(audioBuffer);

      return new Response(
        JSON.stringify({ text: alexText, audio: audioBase64, audioAvailable: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACTION: create-session
    if (action === "create-session") {
      const { data, error } = await supabase.from("voice_sessions").insert({
        user_id: null,
        deep_link_id: null,
        feature: feature || "design",
        transcript: "",
        context_json: {},
      }).select("id").single();

      if (error) throw error;

      return new Response(JSON.stringify({ sessionId: data.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("alex-voice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
