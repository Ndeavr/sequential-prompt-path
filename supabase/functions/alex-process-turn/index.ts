import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { alexVoiceBrain } from "../_shared/alex-voice-brain.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const startTime = Date.now();
    const { session_id, session_token, user_message, message_mode, ui_context } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = session_token || session_id;

    // 1. Get session
    const { data: session } = await supabase
      .from("alex_sessions")
      .select("*")
      .eq("session_token", token)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Save user message
    await supabase.from("alex_messages").insert({
      session_id: session.id,
      sender: "user",
      message: user_message,
      message_type: message_mode || "text",
    });

    // 3. Get conversation history
    const { data: history } = await supabase
      .from("alex_messages")
      .select("sender, message")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .limit(20);

    const messages = (history || []).map((m: any) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.message,
    }));

    // 4. Extract signals from user message
    const signals = extractSignals(user_message, ui_context);

    // 5. Score intent
    const intentResult = scoreIntent(signals);

    // 6. Save intent
    await supabase.from("alex_intents").insert({
      session_id: token,
      user_id: session.user_id || null,
      detected_intent: intentResult.intent,
      confidence_score: intentResult.confidence,
      urgency_score: intentResult.urgency,
      trust_score: intentResult.trust,
      booking_readiness_score: intentResult.readiness,
      friction_score: intentResult.friction,
      raw_signals: signals,
    });

    // 7. Update session with extracted data
    const sessionUpdates: Record<string, any> = {
      last_intent: intentResult.intent,
      current_step: "responding",
      updated_at: new Date().toISOString(),
    };
    if (signals.service) sessionUpdates.project_type = signals.service;
    if (signals.city) sessionUpdates.project_city = signals.city;
    if (intentResult.intent === "high_intent_booking") sessionUpdates.booking_intent = true;

    await supabase.from("alex_sessions").update(sessionUpdates).eq("id", session.id);

    // 8. Get AI response via brain
    const brainResult = await alexVoiceBrain({
      transcript: user_message,
      messages: messages.slice(0, -1), // exclude current (already in transcript)
      userId: session.user_id,
      sessionId: session.id,
      pageContext: {
        currentPage: ui_context?.currentPage,
        isAuthenticated: session.auth_state === "authenticated",
        userRole: session.role_detected,
      },
    });

    // 9. Save Alex response
    const latencyMs = Date.now() - startTime;
    await supabase.from("alex_messages").insert({
      session_id: session.id,
      sender: "alex",
      message: brainResult.alexText,
      message_type: "text",
      latency_ms: latencyMs,
    });

    // 10. Build predictive matches if enough signals
    let primaryMatch = null;
    if (signals.service || signals.city) {
      const matches = await buildMatches(supabase, token, signals);
      primaryMatch = matches[0] || null;
      if (primaryMatch) {
        await supabase.from("alex_sessions").update({
          recommended_contractor_id: primaryMatch.contractor_id,
        }).eq("id", session.id);
      }
    }

    // 11. Get best next action
    const { data: nextAction } = await supabase.rpc("fn_alex_get_best_next_action", {
      _session_id: session.id,
    });

    // 12. Log latency
    await supabase.from("alex_response_latency").insert({
      session_id: token,
      event_name: "process_turn",
      latency_ms: latencyMs,
      is_sla_respected: latencyMs < 2000,
    });

    // 13. Log action
    await supabase.from("alex_actions").insert({
      session_id: token,
      action_type: "process_turn",
      action_status: "completed",
      trigger_source: "edge_function",
      payload: { latency_ms: latencyMs, intent: intentResult.intent },
    });

    return new Response(JSON.stringify({
      alex_response: brainResult.alexText,
      detected_intent: intentResult.intent,
      booking_readiness_score: intentResult.readiness,
      next_action: nextAction,
      ui_actions: brainResult.uiActions,
      primary_match: primaryMatch ? {
        contractor_id: primaryMatch.contractor_id,
        display_name: primaryMatch.business_name,
        match_score: primaryMatch.match_score,
        explanation_summary: primaryMatch.explanation,
      } : null,
      latency_ms: latencyMs,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("alex-process-turn error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Signal extraction ───

interface Signals {
  service: string | null;
  city: string | null;
  urgent: boolean;
  askedPrice: boolean;
  askedBooking: boolean;
  askedTrust: boolean;
  hesitant: boolean;
  spamFear: boolean;
  [key: string]: any;
}

function extractSignals(text: string, uiContext?: any): Signals {
  const lower = text.toLowerCase();
  return {
    service: extractService(lower),
    city: extractCity(lower),
    urgent: /urgent|vite|rapidement|immédiat|tout de suite|dégât|urgence/.test(lower),
    askedPrice: /combien|prix|coût|budget|soumission|estimé|devis/.test(lower),
    askedBooking: /rendez-vous|disponib|réserv|quand|horaire|calendrier/.test(lower),
    askedTrust: /confiance|fiable|garanti|assurance|licence|vérifié/.test(lower),
    hesitant: /pas sûr|je sais pas|hésit|peut-être|réfléchir/.test(lower),
    spamFear: /spam|appeler|harceler/.test(lower),
    currentPage: uiContext?.currentPage,
  };
}

function extractService(text: string): string | null {
  const services: Record<string, string[]> = {
    toiture: ["toit", "toiture", "bardeaux", "couvreur"],
    plomberie: ["plomb", "tuyau", "eau", "drain", "robinet"],
    electricite: ["électri", "panneau", "fils", "prise", "courant"],
    renovation: ["réno", "rénovat"],
    peinture: ["peint", "peintur"],
    chauffage: ["chauff", "thermopompe", "fournaise", "climatis"],
    fenetre: ["fenêtre", "vitre", "porte"],
  };
  for (const [key, keywords] of Object.entries(services)) {
    if (keywords.some((kw) => text.includes(kw))) return key;
  }
  return null;
}

function extractCity(text: string): string | null {
  const cities = [
    "montréal", "montreal", "laval", "longueuil", "québec", "quebec",
    "gatineau", "sherbrooke", "trois-rivières", "saguenay", "lévis",
    "terrebonne", "repentigny", "brossard", "drummondville",
    "saint-jean", "saint-jérôme", "granby", "blainville", "châteauguay",
  ];
  for (const city of cities) {
    if (text.includes(city)) return city;
  }
  return null;
}

// ─── Intent scoring ───

interface IntentResult {
  intent: string;
  confidence: number;
  urgency: number;
  trust: number;
  readiness: number;
  friction: number;
}

function scoreIntent(signals: Signals): IntentResult {
  let intent = "info_seek";
  let confidence = 0.3;
  let urgency = 0;
  let trust = 0.5;
  let readiness = 0;
  let friction = 0.3;

  if (signals.askedBooking && signals.service) {
    intent = "high_intent_booking";
    confidence = 0.85;
    readiness = 80;
    friction = 0.1;
  } else if (signals.askedPrice) {
    intent = "price_sensitive";
    confidence = 0.7;
    readiness = 40;
    friction = 0.4;
  } else if (signals.askedTrust) {
    intent = "trust_needs_reassurance";
    confidence = 0.7;
    trust = 0.3;
    friction = 0.5;
  } else if (signals.service && signals.city) {
    intent = "exploration";
    confidence = 0.6;
    readiness = 50;
  } else if (signals.service) {
    intent = "info_seek";
    confidence = 0.5;
    readiness = 20;
  }

  if (signals.urgent) { urgency = 0.8; readiness = Math.min(100, readiness + 20); }
  if (signals.hesitant) { friction = Math.min(1, friction + 0.2); readiness = Math.max(0, readiness - 10); }
  if (signals.spamFear) { friction = Math.min(1, friction + 0.2); trust = Math.max(0, trust - 0.2); }

  return { intent, confidence, urgency, trust, readiness, friction };
}

// ─── Match building ───

async function buildMatches(supabase: any, sessionToken: string, signals: Signals) {
  const query = supabase
    .from("contractors")
    .select("id, business_name, specialty, city, aipp_score, admin_verified")
    .eq("status", "active")
    .order("aipp_score", { ascending: false })
    .limit(5);

  const { data: contractors } = await query;
  if (!contractors?.length) return [];

  const matches = contractors.map((c: any, i: number) => {
    const matchScore = Math.max(50, 95 - i * 8);
    return {
      contractor_id: c.id,
      business_name: c.business_name || "Professionnel",
      match_score: matchScore,
      availability_score: Math.round(Math.random() * 30 + 70),
      trust_score: c.admin_verified ? 90 : 60,
      is_primary: i === 0,
      explanation: buildExplanation(c, signals),
    };
  });

  // Persist
  const inserts = matches.map((m: any) => ({
    session_id: sessionToken,
    contractor_id: m.contractor_id,
    match_score: m.match_score,
    availability_score: m.availability_score,
    confidence_score: m.match_score * 0.8,
    trust_score: m.trust_score,
    is_primary: m.is_primary,
    explanation_summary: m.explanation,
  }));

  await supabase.from("alex_predictive_matches").insert(inserts);
  return matches;
}

function buildExplanation(contractor: any, signals: Signals): string {
  const parts: string[] = [];
  if (contractor.admin_verified) parts.push("Vérifié par UnPRO");
  if (contractor.aipp_score >= 70) parts.push("Score de qualité élevé");
  if (signals.city && contractor.city?.toLowerCase().includes(signals.city))
    parts.push(`Actif dans ${signals.city}`);
  if (contractor.specialty) parts.push(`Spécialiste en ${contractor.specialty}`);
  return parts.join(" · ") || "Professionnel disponible";
}
