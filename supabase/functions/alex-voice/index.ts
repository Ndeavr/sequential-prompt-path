/**
 * UNPRO — Alex Voice Edge Function (Production)
 *
 * Full premium voice pipeline:
 * User speaks → client STT → this function (greeting/AI brain + French pipeline + TTS) → base64 audio
 *
 * Pipeline per turn:
 *   AI raw text
 *   → extractTags
 *   → rewriteAlexToSpokenFrench
 *   → normalizeFrenchNamesForSpeech
 *   → normalizeTextForFrenchTts
 *   → shapeTextForHumanSpeech
 *   → splitForSpeech
 *   → ElevenLabs TTS (voice gCr8TeSJgJaeaIoV4RWH)
 *
 * Actions:
 * - create-session: deterministic greeting + TTS
 * - respond-stream: text → AI → French voice pipeline → sentence-by-sentence TTS
 * - get-scribe-token: ElevenLabs realtime STT token
 * - save-messages: persist conversation to DB
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import {
  buildAlexGreeting,
  processAlexResponse,
  normalizeTextForFrenchTts,
  ALEX_VOICE_CONFIG,
  ALEX_VOICE_SYSTEM_PROMPT,
  type AlexVoiceProfile,
  getAlexVoiceSettings,
} from "../_shared/alex-french-voice.ts";
import {
  prepareAlexSpeechStyle,
  shapeTextForHumanSpeech,
  type AlexSpeechMode,
} from "../_shared/alex-human-voice.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── TTS Generation ───

async function generateTTS(
  text: string,
  voiceSettingsOverride?: Record<string, unknown>
): Promise<ArrayBuffer | null> {
  try {
    const { voiceId, modelId, outputFormat, chunkLengthSchedule } = ALEX_VOICE_CONFIG;
    const voiceSettings = voiceSettingsOverride ?? ALEX_VOICE_CONFIG.voiceSettings;
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=${outputFormat}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: voiceSettings,
          chunk_length_schedule: chunkLengthSchedule,
        }),
      }
    );
    if (!response.ok) {
      console.error("[alex-voice] TTS error:", response.status, await response.text());
      return null;
    }
    return await response.arrayBuffer();
  } catch (e) {
    console.error("[alex-voice] TTS fetch error:", e);
    return null;
  }
}

// ─── Context builder ───

function buildContextString(ctx: Record<string, any> | undefined, userName?: string | null): string {
  if (!ctx && !userName) return "";
  const parts: string[] = [];
  if (ctx?.currentPage) parts.push(`Page: ${ctx.currentPage}`);
  if (ctx?.activeProperty) parts.push(`Propriété: ${ctx.activeProperty}`);
  if (ctx?.isAuthenticated) parts.push(`Connecté: oui`);
  if (ctx?.userRole) parts.push(`Rôle: ${ctx.userRole}`);
  if (ctx?.hasScore) parts.push(`Score existant: oui`);
  if (ctx?.hasPendingBooking) parts.push(`RDV en attente: oui`);
  if (ctx?.hasUploadedImage) parts.push(`Image uploadée: oui`);
  if (userName) parts.push(`Prénom: ${userName}`);
  return parts.length > 0 ? "\n\nCONTEXTE:\n" + parts.join("\n") : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ─── GET SCRIBE TOKEN ───
    if (action === "get-scribe-token") {
      const response = await fetch(
        "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
        { method: "POST", headers: { "xi-api-key": ELEVENLABS_API_KEY } }
      );
      if (!response.ok) throw new Error(`Scribe token error: ${response.status}`);
      const { token } = await response.json();
      return new Response(JSON.stringify({ token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CREATE SESSION ───
    if (action === "create-session") {
      const { userId, feature, userName, preferredSpokenName, context, voiceProfile, localHour } = body;

      let isReturning = false;
      if (userId) {
        const { count } = await supabase
          .from("voice_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);
        isReturning = (count ?? 0) > 0;
      }

      const { data, error } = await supabase.from("voice_sessions").insert({
        user_id: userId || null,
        feature: feature || "general",
        transcript: "",
        context_json: {
          userName: userName || null,
          preferredSpokenName: preferredSpokenName || null,
          ...context,
          created_at: new Date().toISOString(),
        },
      }).select("id").single();

      if (error) throw error;

      // Deterministic greeting via builder
      const greetingResult = buildAlexGreeting({
        firstName: userName,
        preferredSpokenName: preferredSpokenName || null,
        isReturningUser: isReturning,
        localHour: localHour ?? null,
        utcOffset: -5,
      });

      // Prepare speech style for greeting
      const speechStyle = prepareAlexSpeechStyle({
        mode: "neutral",
        isReturningUser: isReturning,
      });

      // Shape spoken greeting for human delivery
      const shaped = shapeTextForHumanSpeech(greetingResult.spokenGreeting, speechStyle);

      // Normalize for TTS
      const greetingForTTS = normalizeTextForFrenchTts(shaped);

      // Build voice settings (support A/B profiles)
      const voiceSettings = voiceProfile
        ? getAlexVoiceSettings(voiceProfile as AlexVoiceProfile)
        : { ...ALEX_VOICE_CONFIG.voiceSettings, speed: speechStyle.speed };

      const greetingAudio = await generateTTS(greetingForTTS, voiceSettings);
      const greetingBase64 = greetingAudio ? base64Encode(greetingAudio) : null;

      try {
        await supabase.from("voice_events").insert({
          session_id: data.id,
          event_type: "greeting",
          metadata: {
            display_text: greetingResult.displayGreeting,
            spoken_text: greetingResult.spokenGreeting,
            is_returning: isReturning,
            voice_profile: voiceProfile || "default",
          },
        });
      } catch (_) { /* non-blocking */ }

      return new Response(JSON.stringify({
        sessionId: data.id,
        greeting: greetingResult.displayGreeting,
        greetingAudio: greetingBase64,
        isReturning,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── RESPOND-STREAM ───
    if (action === "respond" || action === "respond-stream") {
      const { sessionId, userMessage, messages, context, userName, preferredSpokenName, voiceProfile, mode } = body;

      const contextStr = buildContextString(context, preferredSpokenName || userName);

      const conversationMessages = [
        { role: "system", content: ALEX_VOICE_SYSTEM_PROMPT + contextStr },
        ...(messages || []),
        ...(userMessage ? [{ role: "user", content: userMessage }] : []),
      ];

      // AI brain call
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: conversationMessages,
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Trop de requêtes. Réessayez dans quelques secondes." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Crédits insuffisants." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI error: ${status}`);
      }

      const aiData = await aiResponse.json();
      const rawText = aiData.choices?.[0]?.message?.content || "Je suis là pour vous aider.";

      // ── Full French Voice Pipeline ──
      // Step 1-5: extract tags → spoken rewrite → name normalize → TTS normalize → split
      const { displayText, ttsSentences, uiActions, nextAction } = processAlexResponse(rawText);

      // Step 6: Human voice layer — prepare speech style
      const speechMode = (mode as AlexSpeechMode) || "neutral";
      const speechStyle = prepareAlexSpeechStyle({
        mode: speechMode,
        stressLevel: context?.stressLevel ?? 0,
        urgencyLevel: context?.urgencyLevel ?? 0,
        isReturningUser: context?.isReturning ?? false,
      });

      // Step 7: Shape each sentence for human delivery
      const shapedSentences = ttsSentences.map(s => shapeTextForHumanSpeech(s, speechStyle));

      // Build voice settings
      const voiceSettings = voiceProfile
        ? getAlexVoiceSettings(voiceProfile as AlexVoiceProfile)
        : { ...ALEX_VOICE_CONFIG.voiceSettings, speed: speechStyle.speed };

      // Persist
      if (sessionId) {
        try {
          await supabase.from("voice_events").insert({
            session_id: sessionId,
            event_type: "conversation_turn",
            metadata: {
              user_message: userMessage,
              alex_text: displayText,
              ui_actions: uiActions,
              next_action: nextAction,
              speech_style: speechStyle.label,
              voice_profile: voiceProfile || "default",
            },
          });
        } catch (_) { /* non-blocking */ }

        try {
          await supabase.from("voice_sessions").update({
            transcript: displayText,
            context_json: {
              last_user_message: userMessage,
              last_alex_response: displayText,
              updated_at: new Date().toISOString(),
            },
          }).eq("id", sessionId);
        } catch (_) { /* non-blocking */ }
      }

      // Step 8: Generate TTS for each shaped sentence
      const audioChunks: string[] = [];
      for (const sentence of shapedSentences) {
        const audio = await generateTTS(sentence, voiceSettings);
        if (audio) audioChunks.push(base64Encode(audio));
      }

      return new Response(JSON.stringify({
        text: displayText,
        audioChunks,
        audioAvailable: audioChunks.length > 0,
        uiActions,
        nextAction,
        speechStyle: speechStyle.label,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SAVE MESSAGES ───
    if (action === "save-messages") {
      const { sessionId, conversationMessages } = body;
      if (sessionId && conversationMessages?.length) {
        try {
          await supabase.from("voice_events").insert({
            session_id: sessionId,
            event_type: "conversation_history",
            metadata: { messages: conversationMessages },
          });
        } catch (_) { /* non-blocking */ }
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[alex-voice] error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
