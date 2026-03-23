/**
 * alex-autopilot-evaluate — Edge function for AI-enhanced autopilot decisions.
 * Falls back to deterministic logic but can enrich with LLM when context is ambiguous.
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
      role = "owner",
      firstName,
      currentPage = "/",
      hasScore = false,
      hasUploadedPhoto = false,
      hasPendingBooking = false,
      selectedPlan,
      emotionalHints = [],
      frictionSignals = [],
      intentSignals = [],
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // If confidence is ambiguous or emotional hints present, use AI
    const needsAI = emotionalHints.length > 0 || frictionSignals.length > 2;

    if (needsAI && LOVABLE_API_KEY) {
      const contextSummary = [
        `Rôle: ${role}`,
        `Page: ${currentPage}`,
        `Score: ${hasScore ? "oui" : "non"}`,
        `Photo: ${hasUploadedPhoto ? "oui" : "non"}`,
        `Booking: ${hasPendingBooking ? "oui" : "non"}`,
        `Plan: ${selectedPlan || "aucun"}`,
        `Signaux émotionnels: ${emotionalHints.join(", ") || "aucun"}`,
        `Friction: ${frictionSignals.map((f: any) => f.type).join(", ") || "aucune"}`,
      ].join("\n");

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
              content: `Tu es Alex, assistante IA de UnPRO. Détermine la meilleure prochaine action pour cet utilisateur. Réponds en JSON avec: { "action": string, "mode": "passive"|"guiding"|"assertive"|"urgent", "text": string (1-2 phrases max, français naturel QC), "confidence": number 0-1 }. Actions possibles: upload_photo, show_score, prepare_booking, recommend_plan, show_prediction, clarify_role, explore, wait.`,
            },
            { role: "user", content: contextSummary },
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
              recommendedAction: parsed.action || "wait",
              confidenceScore: parsed.confidence || 0.6,
              autopilotMode: parsed.mode || "guiding",
              alexText: parsed.text || "Je suis là.",
              uiActions: parsed.action === "upload_photo" ? [{ type: "open_upload" }]
                : parsed.action === "show_score" ? [{ type: "show_score" }]
                : parsed.action === "prepare_booking" ? [{ type: "open_booking" }]
                : parsed.action === "recommend_plan" ? [{ type: "show_plan_recommendation" }]
                : [],
              source: "ai",
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        } catch { /* fall through to deterministic */ }
      }
    }

    // Deterministic fallback
    let action = "explore";
    let text = "Je suis là si tu as besoin.";
    let mode = "passive";
    let confidence = 0.5;
    const uiActions: any[] = [];

    if (role === "owner") {
      if (!hasUploadedPhoto) {
        action = "upload_photo";
        text = firstName ? `${firstName}, une photo m'aiderait à mieux comprendre.` : "Une photo m'aiderait à mieux comprendre.";
        mode = "guiding";
        confidence = 0.8;
        uiActions.push({ type: "open_upload" });
      } else if (!hasScore) {
        action = "show_score";
        text = "Ta photo est prête. Je génère ton score ?";
        mode = "assertive";
        confidence = 0.85;
        uiActions.push({ type: "show_score" });
      } else if (!hasPendingBooking) {
        action = "prepare_booking";
        text = "Score en main. On prépare le rendez-vous ?";
        mode = "assertive";
        confidence = 0.8;
        uiActions.push({ type: "open_booking" });
      }
    } else if (role === "contractor") {
      if (!hasScore) {
        action = "show_aipp_score";
        text = "Ton score AIPP va m'aider à te guider.";
        mode = "guiding";
        confidence = 0.8;
        uiActions.push({ type: "show_score" });
      } else if (!selectedPlan) {
        action = "recommend_plan";
        text = "Je peux te montrer le plan qui correspond le mieux.";
        mode = "guiding";
        confidence = 0.75;
        uiActions.push({ type: "show_plan_recommendation" });
      }
    }

    return new Response(JSON.stringify({
      recommendedAction: action,
      confidenceScore: confidence,
      autopilotMode: mode,
      alexText: text,
      uiActions,
      source: "deterministic",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("autopilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
