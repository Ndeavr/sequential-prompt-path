/**
 * UNPRO — Alex Voice Edge Function (Production)
 * 
 * Actions:
 * - create-session: create voice session in DB
 * - respond: STT text → AI response → TTS audio (streamed base64)
 * - respond-stream: STT text → streaming AI + TTS pipeline
 * - get-scribe-token: ElevenLabs realtime STT token
 * - ui-action: parse AI response for UI commands
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Laura — warm, calm, natural French-friendly feminine voice
const VOICE_ID = "FGY2WhTYpPnrIDTdsKH5";

const ALEX_VOICE_SYSTEM = `Tu es Alex, la concierge vocale premium de la plateforme UNPRO.

IDENTITÉ :
- Tu es une femme. Utilise le féminin : « je suis ravie », « bien sûr ».
- Tu ne dis JAMAIS que tu es une IA ou un robot. Tu dis « je suis Alex » ou « je suis votre concierge ».
- Tu es spécialiste en construction, rénovation, habitation, copropriété, immobilier, services aux propriétaires, et gestion d'entrepreneurs.

STYLE VOCAL :
- Réponses TRÈS COURTES. Maximum 2-3 phrases.
- Une seule question à la fois.
- Français québécois naturel, ton calme, chaleureux, sharp, premium.
- Pas de longs paragraphes. Pas de listes. Pas de markdown.
- Tu parles comme dans une vraie conversation téléphonique premium.
- Si on t'interrompt, tu t'arrêtes immédiatement et tu écoutes.

ACCUEIL :
- Matin (avant 12h) : "Bonjour [Prénom]."
- Après-midi (12h-17h) : "Bon après-midi [Prénom]."
- Soir (après 17h) : "Bonsoir [Prénom]."
- Deuxième visite : "Rebonjour [Prénom]."
- Sans prénom : "Bonjour, je suis Alex."

COMPORTEMENT :
- Par défaut, l'utilisateur est un propriétaire.
- Si clairement un entrepreneur → guide vers forfaits et croissance.
- Pose UNE question précise à la fois. Jamais plus.
- Suggère des actions concrètes : upload photo, voir score, comparer plans, réserver.
- Détecte stress → rassure. Détecte urgence → accélère. Détecte hésitation → simplifie.

INTELLIGENCE ÉMOTIONNELLE :
- Rassurante quand stress détecté.
- Plus rapide quand urgence détectée.
- Maximum une petite erreur amusante par jour.

ACTIONS UI DISPONIBLES (retourne-les dans ta réponse entre balises) :
<ui_action type="navigate" target="/dashboard/properties" />
<ui_action type="open_upload" />
<ui_action type="show_score" />
<ui_action type="show_pricing" />
<ui_action type="open_booking" />
<ui_action type="scroll_to" target="recommendations" />
<ui_action type="show_chips" items="option1,option2,option3" />

RÈGLES ABSOLUES :
- Réponds en 1-3 phrases max. C'est de la voix, pas du texte.
- Ne fais jamais de liste à puces en mode vocal.
- Termine toujours par une question OU une suggestion d'action.
- Ne bloque jamais le progrès.
- N'invente rien.`;

function getGreeting(userName?: string | null, isReturning = false): string {
  const hour = new Date().getUTCHours() - 5; // EST approximation
  const name = userName ? ` ${userName}` : "";
  
  if (isReturning && userName) return `Rebonjour${name}.`;
  
  if (hour < 12) return `Bonjour${name}.`;
  if (hour < 17) return `Bon après-midi${name}.`;
  return `Bonsoir${name}.`;
}

async function generateTTS(text: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.78,
            style: 0.15,
            use_speaker_boost: true,
            speed: 1.05,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("TTS error:", response.status, await response.text());
      return null;
    }

    return await response.arrayBuffer();
  } catch (e) {
    console.error("TTS fetch error:", e);
    return null;
  }
}

// Extract UI actions from Alex's response
function extractUIActions(text: string): { cleanText: string; actions: Array<Record<string, string>> } {
  const actions: Array<Record<string, string>> = [];
  const regex = /<ui_action\s+([^/>]+)\s*\/>/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const attrs: Record<string, string> = {};
    const attrRegex = /(\w+)="([^"]+)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(match[1])) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    if (attrs.type) actions.push(attrs);
  }
  
  const cleanText = text.replace(/<ui_action[^/>]*\/>/g, "").trim();
  return { cleanText, actions };
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
        {
          method: "POST",
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
        }
      );
      if (!response.ok) {
        throw new Error(`Scribe token error: ${response.status}`);
      }
      const { token } = await response.json();
      return new Response(JSON.stringify({ token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CREATE SESSION ───
    if (action === "create-session") {
      const { userId, feature, userName, context } = body;
      
      const { data, error } = await supabase.from("voice_sessions").insert({
        user_id: userId || null,
        feature: feature || "general",
        transcript: "",
        context_json: {
          userName: userName || null,
          ...context,
          created_at: new Date().toISOString(),
        },
      }).select("id").single();

      if (error) throw error;

      const greeting = getGreeting(userName, false);

      // Generate greeting TTS
      const greetingAudio = await generateTTS(greeting + " Comment puis-je vous aider?");
      const greetingBase64 = greetingAudio ? base64Encode(greetingAudio) : null;

      return new Response(JSON.stringify({
        sessionId: data.id,
        greeting: greeting + " Comment puis-je vous aider?",
        greetingAudio: greetingBase64,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── RESPOND (non-streaming, fast) ───
    if (action === "respond") {
      const { sessionId, userMessage, messages, context, userName } = body;

      // Build context string
      let contextStr = "";
      if (context?.currentPage) contextStr += `\nPage actuelle: ${context.currentPage}`;
      if (context?.activeProperty) contextStr += `\nPropriété active: ${context.activeProperty}`;
      if (context?.isAuthenticated) contextStr += `\nUtilisateur connecté: oui`;
      if (context?.userRole) contextStr += `\nRôle: ${context.userRole}`;
      if (context?.hasScore) contextStr += `\nScore maison existant: oui`;
      if (userName) contextStr += `\nPrénom: ${userName}`;

      const conversationMessages = [
        { role: "system", content: ALEX_VOICE_SYSTEM + contextStr },
        ...(messages || []),
        ...(userMessage ? [{ role: "user", content: userMessage }] : []),
      ];

      // AI Response
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
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const rawText = aiData.choices?.[0]?.message?.content || "Je suis là pour vous aider.";
      
      // Extract UI actions
      const { cleanText, actions } = extractUIActions(rawText);

      // Log voice event
      if (sessionId) {
        await supabase.from("voice_events").insert({
          session_id: sessionId,
          event_type: "ai_response",
          metadata: { 
            user_message: userMessage,
            alex_text: cleanText, 
            ui_actions: actions,
          },
        }).catch(() => {});
      }

      // Generate TTS
      const audioBuffer = await generateTTS(cleanText);
      const audioBase64 = audioBuffer ? base64Encode(audioBuffer) : null;

      return new Response(JSON.stringify({
        text: cleanText,
        audio: audioBase64,
        audioAvailable: !!audioBase64,
        uiActions: actions,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── RESPOND-STREAM: Sentence-by-sentence TTS ───
    if (action === "respond-stream") {
      const { sessionId, userMessage, messages, context, userName } = body;

      let contextStr = "";
      if (context?.currentPage) contextStr += `\nPage actuelle: ${context.currentPage}`;
      if (context?.activeProperty) contextStr += `\nPropriété active: ${context.activeProperty}`;
      if (context?.isAuthenticated) contextStr += `\nUtilisateur connecté: oui`;
      if (context?.userRole) contextStr += `\nRôle: ${context.userRole}`;
      if (userName) contextStr += `\nPrénom: ${userName}`;

      const conversationMessages = [
        { role: "system", content: ALEX_VOICE_SYSTEM + contextStr },
        ...(messages || []),
        ...(userMessage ? [{ role: "user", content: userMessage }] : []),
      ];

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: conversationMessages,
          stream: true,
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429 || status === 402) {
          return new Response(JSON.stringify({ error: status === 429 ? "Rate limit" : "Payment required" }), {
            status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI stream error: ${status}`);
      }

      // Stream AI response, collect full text, then TTS
      const reader = aiResponse.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullText += content;
          } catch { /* partial */ }
        }
      }

      if (!fullText) fullText = "Je suis là pour vous aider.";

      const { cleanText, actions } = extractUIActions(fullText);

      // Log
      if (sessionId) {
        await supabase.from("voice_events").insert({
          session_id: sessionId,
          event_type: "ai_response_stream",
          metadata: { user_message: userMessage, alex_text: cleanText, ui_actions: actions },
        }).catch(() => {});
      }

      // Split into sentences for chunked TTS
      const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
      const audioChunks: string[] = [];

      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length < 3) continue;
        const audio = await generateTTS(trimmed);
        if (audio) audioChunks.push(base64Encode(audio));
      }

      return new Response(JSON.stringify({
        text: cleanText,
        audioChunks,
        audioAvailable: audioChunks.length > 0,
        uiActions: actions,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("alex-voice error:", e);
    return new Response(JSON.stringify({ 
      error: e instanceof Error ? e.message : "Unknown error" 
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
