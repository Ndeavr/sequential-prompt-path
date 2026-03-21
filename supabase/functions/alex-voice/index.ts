/**
 * UNPRO — Alex Voice Edge Function (Production)
 * 
 * Full voice pipeline:
 * User speaks → client STT → this function (AI brain + TTS) → base64 audio response
 * 
 * Actions:
 * - create-session: create voice session, return greeting + TTS
 * - respond-stream: text → AI response → sentence-by-sentence TTS
 * - get-scribe-token: ElevenLabs realtime STT token
 * - save-messages: persist conversation to DB
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
- Tu as de l'expérience terrain, en vente, en gouvernance de copropriété, en réalités de quorum/syndicat.

STYLE VOCAL :
- Réponses TRÈS COURTES. Maximum 2-3 phrases.
- Une seule question à la fois. Jamais plus.
- Français québécois naturel, ton calme, chaleureux, sharp, premium.
- Pas de longs paragraphes. Pas de listes à puces. Pas de markdown.
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
- Suggère des actions concrètes : upload photo, voir score, comparer plans, réserver, vérifier entrepreneur.
- Détecte stress → rassure. Détecte urgence → accélère. Détecte hésitation → simplifie.
- Préfère toujours le mouvement vers la prochaine action. Ne bloque jamais le progrès.
- Adapte-toi à la sensibilité budgétaire.

INTELLIGENCE ÉMOTIONNELLE :
- Rassurante quand stress détecté.
- Plus rapide quand urgence détectée.
- Maximum une petite erreur amusante par jour.

ACTIONS UI DISPONIBLES (retourne-les dans ta réponse entre balises) :
<ui_action type="navigate" target="/dashboard/properties" />
<ui_action type="open_upload" />
<ui_action type="show_score" />
<ui_action type="show_pricing" />
<ui_action type="show_plan_recommendation" target="elite" />
<ui_action type="open_booking" />
<ui_action type="scroll_to" target="recommendations" />
<ui_action type="highlight" target="[data-plan='elite']" />
<ui_action type="draw_circle" target="[data-plan='premium']" />
<ui_action type="show_chips" items="option1,option2,option3" />

PROCHAINE MEILLEURE ACTION :
À la fin de ta réponse, ajoute une balise indiquant ce que l'utilisateur devrait faire ensuite :
<next_action>description courte de l'action</next_action>

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

function extractNextAction(text: string): { cleanText: string; nextAction: string | null } {
  const regex = /<next_action>([\s\S]*?)<\/next_action>/;
  const match = regex.exec(text);
  const nextAction = match ? match[1].trim() : null;
  const cleanText = text.replace(/<next_action>[\s\S]*?<\/next_action>/g, "").trim();
  return { cleanText, nextAction };
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
      const { userId, feature, userName, context } = body;

      // Check for returning user
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
          ...context,
          created_at: new Date().toISOString(),
        },
      }).select("id").single();

      if (error) throw error;

      const greeting = getGreeting(userName, isReturning);
      const fullGreeting = greeting + " Comment puis-je vous aider?";

      const greetingAudio = await generateTTS(fullGreeting);
      const greetingBase64 = greetingAudio ? base64Encode(greetingAudio) : null;

      // Persist greeting as first message
      try {
        await supabase.from("voice_events").insert({
          session_id: data.id,
          event_type: "greeting",
          metadata: { alex_text: fullGreeting, is_returning: isReturning },
        });
      } catch (_) {}

      return new Response(JSON.stringify({
        sessionId: data.id,
        greeting: fullGreeting,
        greetingAudio: greetingBase64,
        isReturning,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── RESPOND-STREAM: Full pipeline ───
    if (action === "respond" || action === "respond-stream") {
      const { sessionId, userMessage, messages, context, userName } = body;

      let contextStr = "";
      if (context?.currentPage) contextStr += `\nPage actuelle: ${context.currentPage}`;
      if (context?.activeProperty) contextStr += `\nPropriété active: ${context.activeProperty}`;
      if (context?.isAuthenticated) contextStr += `\nUtilisateur connecté: oui`;
      if (context?.userRole) contextStr += `\nRôle: ${context.userRole}`;
      if (context?.hasScore) contextStr += `\nScore maison existant: oui`;
      if (context?.hasPendingBooking) contextStr += `\nRendez-vous en attente: oui`;
      if (context?.hasUploadedImage) contextStr += `\nImage uploadée: oui`;
      if (userName) contextStr += `\nPrénom: ${userName}`;

      const conversationMessages = [
        { role: "system", content: ALEX_VOICE_SYSTEM + contextStr },
        ...(messages || []),
        ...(userMessage ? [{ role: "user", content: userMessage }] : []),
      ];

      // Call AI brain
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
      let rawText = aiData.choices?.[0]?.message?.content || "Je suis là pour vous aider.";

      // Extract next action then UI actions
      const { cleanText: afterNextAction, nextAction } = extractNextAction(rawText);
      const { cleanText, actions } = extractUIActions(afterNextAction);

      // Persist conversation to DB
      if (sessionId) {
        try {
          await supabase.from("voice_events").insert({
            session_id: sessionId,
            event_type: "conversation_turn",
            metadata: {
              user_message: userMessage,
              alex_text: cleanText,
              ui_actions: actions,
              next_action: nextAction,
            },
          });
        } catch (_) {}

        // Update session transcript
        try {
          await supabase.from("voice_sessions").update({
            transcript: cleanText,
            context_json: {
              last_user_message: userMessage,
              last_alex_response: cleanText,
              updated_at: new Date().toISOString(),
            },
          }).eq("id", sessionId);
        } catch (_) {}
      }

      // Generate TTS — split into sentences for chunked playback
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
        nextAction,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SAVE MESSAGES (batch persist) ───
    if (action === "save-messages") {
      const { sessionId, conversationMessages } = body;
      if (sessionId && conversationMessages?.length) {
        try {
          await supabase.from("voice_events").insert({
            session_id: sessionId,
            event_type: "conversation_history",
            metadata: { messages: conversationMessages },
          });
        } catch (_) {}
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("alex-voice error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
