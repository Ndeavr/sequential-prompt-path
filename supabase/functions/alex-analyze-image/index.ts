/**
 * Alex — Analyse d'image / capture d'écran
 * Renvoie un diagnostic concierge en 5 lignes max + classification d'intent.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RISK_KEYWORDS = [
  "mur de soutènement", "soutenement", "ruissellement", "drainage",
  "infiltration", "pente", "voisin", "terrain", "condo", "fondation",
  "fissure", "affaissement", "érosion", "erosion", "syndicat",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { image_base64, mime_type = "image/jpeg", user_message = "" } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Tu es Alex d'UNPRO, concierge expert en bâtiment résidentiel et copropriétés au Québec.

L'utilisateur t'envoie une photo OU une capture d'écran (texte de Reddit, Facebook, courriel, soumission, etc.).

ÉTAPES OBLIGATOIRES:
1. Détecte si c'est une capture de TEXTE (screenshot_text) ou une vraie PHOTO de problème (photo_situation).
2. Si screenshot_text: lis le texte, identifie le sujet, le risque, ce qu'il faut vérifier.
3. Si photo_situation: identifie le problème visible.
4. Classifie l'intent:
   - property_risk_assessment: risque pour la propriété (drainage, soutenement, infiltration, voisinage, fondation)
   - building_problem_diagnosis: problème de bâtiment classique
   - quote_analysis: soumission ou facture
   - condo_governance: dossier syndicat / Loi 16
   - generic: aucun contexte clair
5. Évalue la confiance (0-1).

RÉPONSE TEXTE (champ "response_text") — règles strictes:
- 5 lignes maximum.
- Format:
  Ligne 1: "Photo reçue." + résumé du problème détecté.
  Ligne 2: Risque principal.
  Ligne 3: Quoi vérifier maintenant (concret, actionnable).
  Ligne 4: Prochaine action UNPRO ("Je peux préparer…", "Je peux contacter…", "Je peux planifier…").
  Ligne 5 (optionnelle): question de précision ou réassurance courte.
- Ton expert, humain, rassurant. Jamais de checklist générique "Eau / humidité / Bruit / Odeur".
- Français québécois. Pas d'emoji. Pas de markdown.

INTERDIT:
- Liste générique de catégories de problèmes.
- "Est-ce plus un problème de…" sauf si confidence < 0.4.
- Disclaimers.`;

    const userText = user_message?.trim()
      ? `Question de l'utilisateur: "${user_message}". Analyse la pièce jointe en tenant compte de cette question.`
      : "Analyse cette pièce jointe et donne ton diagnostic concierge.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: `data:${mime_type};base64,${image_base64}` } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "alex_image_diagnosis",
            description: "Diagnostic concierge d'une image ou capture envoyée par l'utilisateur.",
            parameters: {
              type: "object",
              properties: {
                image_type: { type: "string", enum: ["screenshot_text", "photo_situation", "document", "other"] },
                extracted_text: { type: "string", description: "Texte OCR si screenshot, sinon vide." },
                problem_summary: { type: "string", description: "Résumé du problème détecté en 1 phrase." },
                main_risk: { type: "string", description: "Risque principal pour la propriété ou le client." },
                what_to_verify: { type: "string", description: "Action concrète de vérification immédiate." },
                next_unpro_action: { type: "string", description: "Prochaine action proposée par UNPRO." },
                intent: {
                  type: "string",
                  enum: ["property_risk_assessment", "building_problem_diagnosis", "quote_analysis", "condo_governance", "generic"],
                },
                confidence: { type: "number" },
                response_text: { type: "string", description: "Réponse finale d'Alex à afficher (5 lignes max, ton concierge)." },
              },
              required: ["image_type", "problem_summary", "main_risk", "what_to_verify", "next_unpro_action", "intent", "confidence", "response_text"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "alex_image_diagnosis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway", response.status, t);
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) {
      return new Response(JSON.stringify({ error: "no_diagnosis" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = JSON.parse(tc.function.arguments);

    // Force property_risk_assessment if extracted text contains risk keywords
    const text = String(result.extracted_text || "").toLowerCase();
    if (text && RISK_KEYWORDS.some((k) => text.includes(k))) {
      result.intent = "property_risk_assessment";
      if (typeof result.confidence === "number" && result.confidence < 0.5) {
        result.confidence = 0.7;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[alex-analyze-image]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
