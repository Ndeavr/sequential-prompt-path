/**
 * alex-reality-evaluate — AI-enhanced predictive engine for Alex.
 * Fuses context signals and optionally calls LLM for nuanced predictions.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      role = "homeowner",
      firstName,
      season,
      month,
      localHour,
      weatherHint,
      propertyAge,
      propertyType,
      hasScore = false,
      hasPhoto = false,
      hasBooking = false,
      hasPlan = false,
      hasProfile = false,
      memorySummary,
      sessionHistory,
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Use AI when we have rich context
    const hasRichContext = memorySummary || (sessionHistory && sessionHistory.length > 0);

    if (hasRichContext && LOVABLE_API_KEY) {
      const contextLines = [
        `Rôle: ${role}`,
        `Saison: ${season}, Mois: ${month}, Heure locale: ${localHour}`,
        `Météo: ${weatherHint || "normal"}`,
        `Propriété: ${propertyType || "inconnue"}, âge: ${propertyAge || "inconnu"} ans`,
        `Score: ${hasScore ? "oui" : "non"}, Photo: ${hasPhoto ? "oui" : "non"}`,
        `Booking: ${hasBooking ? "oui" : "non"}, Plan: ${hasPlan ? "oui" : "non"}`,
        memorySummary ? `Mémoire: ${memorySummary}` : "",
        sessionHistory ? `Historique session: ${JSON.stringify(sessionHistory).slice(0, 500)}` : "",
      ].filter(Boolean).join("\n");

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `Tu es Alex, l'assistante IA d'UnPRO. Tu dois ANTICIPER le prochain besoin de l'utilisateur AVANT qu'il le demande. Analyse le contexte et réponds en JSON: { "predictedNeed": string, "urgencyLevel": "low"|"medium"|"high"|"critical", "confidenceScore": number 0-1, "recommendedAction": string, "alexText": string (1-2 phrases max, français naturel QC, jamais corporatif), "triggerType": "passive_suggestion"|"contextual_nudge"|"strong_recommendation"|"urgent_alert" }. Actions possibles: upload_photo, show_score, prepare_booking, recommend_plan, show_prediction, complete_profile, prep_meeting, general_maintenance.`,
            },
            { role: "user", content: contextLines },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const raw = aiData.choices?.[0]?.message?.content || "";
        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return new Response(JSON.stringify({
              ...parsed,
              source: "ai",
              uiActions: mapActionToUI(parsed.recommendedAction),
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        } catch { /* fall through */ }
      }
    }

    // Deterministic fallback
    const prediction = getDeterministicPrediction({ role, season, month, localHour, weatherHint, propertyAge, hasScore, hasPhoto, hasBooking, hasPlan, hasProfile, firstName });

    return new Response(JSON.stringify({ ...prediction, source: "deterministic" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("reality-evaluate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function mapActionToUI(action: string) {
  const map: Record<string, Array<{ type: string }>> = {
    upload_photo: [{ type: "open_upload" }],
    show_score: [{ type: "show_score" }],
    prepare_booking: [{ type: "open_booking" }],
    recommend_plan: [{ type: "show_plan_recommendation" }],
    show_prediction: [{ type: "show_prediction" }],
    complete_profile: [{ type: "navigate" }],
  };
  return map[action] || [];
}

function getDeterministicPrediction(ctx: any) {
  const { role, season, weatherHint, hasScore, hasPhoto, hasBooking, hasPlan, hasProfile, firstName } = ctx;
  const name = firstName ? `${firstName}, ` : "";

  if (role === "homeowner" || role === "owner") {
    if (season === "winter" && weatherHint === "snow") {
      return {
        predictedNeed: "roof_inspection",
        urgencyLevel: "medium",
        confidenceScore: 0.75,
        recommendedAction: "upload_photo",
        alexText: `${name}avec la neige qu'on a… ton entretoit pourrait accumuler de l'humidité. Tu veux que je regarde ça avec une photo ?`,
        triggerType: "contextual_nudge",
        uiActions: [{ type: "open_upload" }],
      };
    }
    if (season === "spring" && !hasScore) {
      return {
        predictedNeed: "spring_inspection",
        urgencyLevel: "low",
        confidenceScore: 0.8,
        recommendedAction: "show_score",
        alexText: `${name}c'est le bon moment pour vérifier ton isolation après l'hiver. Tu veux voir ton score ?`,
        triggerType: "contextual_nudge",
        uiActions: [{ type: "show_score" }],
      };
    }
    if (!hasPhoto) {
      return {
        predictedNeed: "photo_upload",
        urgencyLevel: "low",
        confidenceScore: 0.65,
        recommendedAction: "upload_photo",
        alexText: `${name}une photo m'aiderait à mieux comprendre ta situation.`,
        triggerType: "passive_suggestion",
        uiActions: [{ type: "open_upload" }],
      };
    }
    if (hasScore && !hasBooking) {
      return {
        predictedNeed: "booking_followup",
        urgencyLevel: "medium",
        confidenceScore: 0.75,
        recommendedAction: "prepare_booking",
        alexText: "Ton score est prêt. On planifie un rendez-vous avec un pro ?",
        triggerType: "contextual_nudge",
        uiActions: [{ type: "open_booking" }],
      };
    }
  }

  if (role === "contractor") {
    if (!hasProfile) {
      return {
        predictedNeed: "profile_completion",
        urgencyLevel: "medium",
        confidenceScore: 0.8,
        recommendedAction: "complete_profile",
        alexText: `${name}complète ton profil pour recevoir plus d'opportunités.`,
        triggerType: "contextual_nudge",
        uiActions: [{ type: "navigate" }],
      };
    }
    if (!hasPlan) {
      return {
        predictedNeed: "plan_upgrade",
        urgencyLevel: "medium",
        confidenceScore: 0.72,
        recommendedAction: "recommend_plan",
        alexText: `${name}tu pourrais facilement remplir 3 rendez-vous de plus par semaine. Tu veux voir comment ?`,
        triggerType: "contextual_nudge",
        uiActions: [{ type: "show_plan_recommendation" }],
      };
    }
  }

  return {
    predictedNeed: "general_maintenance",
    urgencyLevel: "low",
    confidenceScore: 0.5,
    recommendedAction: "explore",
    alexText: "Je suis là si tu as besoin.",
    triggerType: "passive_suggestion",
    uiActions: [],
  };
}
