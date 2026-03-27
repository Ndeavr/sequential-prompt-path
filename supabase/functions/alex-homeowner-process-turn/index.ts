import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- Intent detection patterns ---
const PROJECT_PATTERNS: Record<string, RegExp[]> = {
  toiture: [/toiture|toit|roof|shingle|couvreur/i],
  plomberie: [/plomb|fuite|water leak|plumber|tuyau|drain/i],
  electricite: [/électri|panneau|breaker|wiring|electrician/i],
  renovation: [/rénov|remodel|refaire|cuisine|salle de bain|bathroom|kitchen/i],
  peinture: [/peint|paint|walls/i],
  demenagement: [/déménag|moving|mover|déménageur/i],
  notaire: [/notaire|notary|acte/i],
  paysagement: [/paysag|landscap|terrain|gazon|lawn/i],
  chauffage: [/chauffag|furnace|heat|thermopompe|heat pump|climatisation|hvac/i],
  fondation: [/fondation|foundation|crack|fissure/i],
};

const CITY_PATTERNS = [
  /(?:à|in|near|dans|sur)\s+([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[\s-][A-ZÀ-Ÿ][a-zà-ÿ]+)*)/,
  /(?:secteur|area|zone|quartier)\s+(?:de\s+)?([A-ZÀ-Ÿ][a-zà-ÿ]+(?:[\s-][A-ZÀ-Ÿ][a-zà-ÿ]+)*)/,
];

const URGENCY_SIGNALS = {
  high: /urgent|emergency|tout de suite|right now|immédiat|asap|dégât d'eau|water damage|inondation|flood/i,
  moderate: /bientôt|soon|cette semaine|this week|rapidement|quickly/i,
  low: /éventuellement|eventually|pas pressé|no rush|quand possible|when possible/i,
};

const OBJECTION_PATTERNS: Record<string, RegExp> = {
  not_ready: /pas prêt|not ready|pas sûr|not sure|j'hésite|I'm hesitating/i,
  wants_to_compare: /comparer|compare|autres options|other options|magasiner|shop around/i,
  trust_issue: /confiance|trust|fiable|reliable|comment je sais|how do I know/i,
  price_uncertainty: /combien|how much|prix|price|coût|cost|cher|expensive/i,
  spam_fear: /spam|appels|calls|harceler|harass|solicitation/i,
  booking_resistance: /pas réserver|don't want to book|juste regarder|just looking|pas tout de suite|not yet/i,
  login_resistance: /pas de compte|no account|pourquoi créer|why create|pas envie de m'inscrire|don't want to sign up/i,
  need_partner_approval: /partenaire|partner|conjoint|spouse|discuter|discuss/i,
};

const OBJECTION_RESPONSES: Record<string, { fr: string; en: string }> = {
  not_ready: { fr: "On peut juste regarder les options.", en: "We can just look at the options." },
  wants_to_compare: { fr: "Je comprends. On peut commencer par voir le meilleur fit.", en: "I understand. We can start by finding the best fit." },
  trust_issue: { fr: "Tous les pros sur UNPRO sont vérifiés. Je vous montre pourquoi celui-ci.", en: "All pros on UNPRO are verified. Let me show you why this one." },
  price_uncertainty: { fr: "Le rendez-vous est gratuit. Vous aurez un vrai portrait avant de décider.", en: "The consultation is free. You'll have a clear picture before deciding." },
  spam_fear: { fr: "Aucun spam. Un seul pro, celui qui correspond.", en: "No spam. Just one pro — the one that matches." },
  booking_resistance: { fr: "Vous n'êtes pas obligé de réserver tout de suite.", en: "You don't have to book right away." },
  login_resistance: { fr: "C'est juste pour garder votre demande prête.", en: "It's just to keep your request ready." },
  need_partner_approval: { fr: "Pas de problème. Je garde tout prêt pour quand vous serez prêt.", en: "No problem. I'll keep everything ready for when you're set." },
};

function detectLanguage(text: string): "fr" | "en" {
  const frWords = (text.match(/\b(je|vous|pour|dans|avec|est|mon|une|des|les|que|qui|pas|mais|aussi|quel|fait|besoin|cherche|veux|chez)\b/gi) || []).length;
  const enWords = (text.match(/\b(I|you|for|the|with|is|my|need|want|looking|have|got|can|how|what|where)\b/gi) || []).length;
  return frWords >= enWords ? "fr" : "en";
}

function detectProject(text: string): string | null {
  for (const [type, patterns] of Object.entries(PROJECT_PATTERNS)) {
    if (patterns.some((p) => p.test(text))) return type;
  }
  return null;
}

function detectCity(text: string): string | null {
  for (const pattern of CITY_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function detectUrgency(text: string): string | null {
  for (const [level, pattern] of Object.entries(URGENCY_SIGNALS)) {
    if (pattern.test(text)) return level;
  }
  return null;
}

function detectObjection(text: string): { type: string; text: string } | null {
  for (const [type, pattern] of Object.entries(OBJECTION_PATTERNS)) {
    if (pattern.test(text)) return { type, text };
  }
  return null;
}

function computeNextAction(session: any): { type: string; label_fr: string; label_en: string } {
  if (!session.project_type) return { type: "ask_project_type", label_fr: "C'est pour quel type de projet?", label_en: "What kind of project is it?" };
  if (!session.city) return { type: "ask_city", label_fr: "Vous êtes dans quel secteur?", label_en: "What area are you in?" };
  if (!session.urgency_level) return { type: "ask_urgency", label_fr: "C'est urgent ou vous avez un peu de marge?", label_en: "Is it urgent, or do you have a bit of time?" };
  if (!session.recommended_contractor_id) return { type: "show_diagnosis", label_fr: "Je regarde ce que j'ai pour vous.", label_en: "Let me check what I have for you." };
  if (!session.booking_ready) return { type: "show_recommended_pro", label_fr: "Je vous proposerais celui-ci pour commencer.", label_en: "I'd start with this one." };
  return { type: "open_calendar", label_fr: "Je peux vous montrer les disponibilités.", label_en: "I can show you the availability." };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { homeowner_session_id, user_message, message_mode, ui_context } = await req.json();
    if (!homeowner_session_id || !user_message) {
      return new Response(JSON.stringify({ error: "Missing homeowner_session_id or user_message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get session
    const { data: session, error: sessionErr } = await supabase
      .from("alex_homeowner_sessions")
      .select("*")
      .eq("session_token", homeowner_session_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = detectLanguage(user_message);
    const detectedProject = detectProject(user_message);
    const detectedCity = detectCity(user_message);
    const detectedUrgency = detectUrgency(user_message);
    const objection = detectObjection(user_message);

    // Update session with detected signals
    const updates: Record<string, any> = {};
    if (detectedProject && !session.project_type) updates.project_type = detectedProject;
    if (detectedCity && !session.city) updates.city = detectedCity;
    if (detectedUrgency && !session.urgency_level) updates.urgency_level = detectedUrgency;
    if (lang !== session.language) updates.language = lang;

    if (Object.keys(updates).length > 0) {
      await supabase.from("alex_homeowner_sessions").update(updates).eq("id", session.id);
    }

    const currentSession = { ...session, ...updates };

    // Handle objection
    let objectionState = null;
    if (objection) {
      await supabase.from("alex_homeowner_objections").insert({
        homeowner_session_id: session.id,
        objection_type: objection.type,
        detected_text: objection.text,
        response_used: OBJECTION_RESPONSES[objection.type]?.[lang] || null,
        resolved: false,
      });
      objectionState = {
        type: objection.type,
        response: OBJECTION_RESPONSES[objection.type]?.[lang] || (lang === "fr" ? "Je comprends." : "I understand."),
      };
    }

    // Save diagnosis if enough info
    let diagnosis = null;
    if (currentSession.project_type && currentSession.city) {
      const { data: existingDiag } = await supabase
        .from("homeowner_project_diagnoses")
        .select("id")
        .eq("homeowner_session_id", session.id)
        .limit(1)
        .maybeSingle();

      if (!existingDiag) {
        const { data: diag } = await supabase.from("homeowner_project_diagnoses").insert({
          homeowner_session_id: session.id,
          detected_project_type: currentSession.project_type,
          detected_city: currentSession.city,
          urgency_level: currentSession.urgency_level || "moderate",
          recommended_professional_type: currentSession.project_type,
        }).select().single();
        diagnosis = diag;

        await supabase.from("alex_homeowner_sessions").update({ current_step: "matching" }).eq("id", session.id);
      }
    }

    // Compute next action
    const nextAction = computeNextAction(currentSession);

    // Build response
    let responseText: string;
    if (objectionState) {
      responseText = objectionState.response;
    } else if (diagnosis) {
      responseText = lang === "fr"
        ? `Je regarde ce que j'ai pour un projet de ${currentSession.project_type} dans le secteur de ${currentSession.city}.`
        : `Let me check what I have for a ${currentSession.project_type} project in the ${currentSession.city} area.`;
    } else {
      responseText = lang === "fr" ? nextAction.label_fr : nextAction.label_en;
    }

    // Log event
    await supabase.from("alex_homeowner_events").insert({
      homeowner_session_id: session.id,
      event_type: "process_turn",
      event_status: "completed",
      payload: { user_message, detected: { project: detectedProject, city: detectedCity, urgency: detectedUrgency, objection: objection?.type } },
    });

    // Score intent
    const intentScore = currentSession.project_type ? 30 : 10;
    const trustScore = objection?.type === "trust_issue" ? 20 : 60;
    const urgencyScore = currentSession.urgency_level === "high" ? 90 : currentSession.urgency_level === "moderate" ? 60 : 30;
    const bookingReadiness = (currentSession.project_type ? 25 : 0) + (currentSession.city ? 20 : 0) + (currentSession.urgency_level ? 15 : 0) + (currentSession.recommended_contractor_id ? 25 : 0);

    return new Response(JSON.stringify({
      alex_response_chunks: [{ text: responseText, type: "speech" }],
      detected_intent: currentSession.project_type || "exploring",
      next_action: nextAction,
      diagnosis: diagnosis ? {
        project_type: diagnosis.detected_project_type,
        city: diagnosis.detected_city,
        urgency: diagnosis.urgency_level,
        professional_type: diagnosis.recommended_professional_type,
      } : null,
      objection_state: objectionState,
      scores: { intent: intentScore, trust: trustScore, urgency: urgencyScore, booking_readiness: bookingReadiness },
      ui_actions: diagnosis ? [{ type: "show_diagnosis_card", data: diagnosis }] : [],
      language: lang,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("alex-homeowner-process-turn error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
