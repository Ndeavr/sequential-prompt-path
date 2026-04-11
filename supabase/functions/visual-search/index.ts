import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { image_base64, locale = "fr-CA" } = await req.json();
    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Tu es un expert en bâtiment résidentiel au Québec. L'utilisateur te montre une photo d'un problème dans sa maison.

Analyse la photo et retourne un diagnostic structuré. Réponds UNIQUEMENT via l'outil fourni.

Règles:
- Identifie le problème principal visible
- Estime un niveau d'urgence (faible, modéré, urgent, critique)
- Estime une fourchette de prix réaliste au Québec en CAD
- Suggère le type de professionnel requis
- Donne 3 actions prioritaires
- Sois précis mais accessible pour un propriétaire non-expert
- Si la photo ne montre pas clairement un problème de bâtiment, dis-le honnêtement`;

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
              { type: "text", text: "Analyse cette photo et donne-moi un diagnostic complet." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_base64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "diagnostic_visuel",
              description: "Retourne le diagnostic structuré d'un problème résidentiel identifié visuellement.",
              parameters: {
                type: "object",
                properties: {
                  problem_detected: { type: "boolean", description: "true si un problème de bâtiment est visible" },
                  problem_label: { type: "string", description: "Nom court du problème (ex: Fissure de fondation)" },
                  problem_description: { type: "string", description: "Description détaillée du problème en 2-3 phrases" },
                  category: {
                    type: "string",
                    enum: ["structure", "toiture", "plomberie", "electricite", "isolation", "humidite", "revetement", "fenestration", "ventilation", "autre"],
                  },
                  urgency: { type: "string", enum: ["faible", "modere", "urgent", "critique"] },
                  estimated_cost_min: { type: "number", description: "Estimation basse en CAD" },
                  estimated_cost_max: { type: "number", description: "Estimation haute en CAD" },
                  professional_type: { type: "string", description: "Type de professionnel recommandé (ex: Maçon, Couvreur)" },
                  priority_actions: {
                    type: "array",
                    items: { type: "string" },
                    description: "3 actions prioritaires à prendre",
                  },
                  confidence: { type: "number", description: "Confiance du diagnostic 0-1" },
                  seasonal_note: { type: "string", description: "Note saisonnière si pertinent (ex: Réparer avant l'hiver)" },
                },
                required: ["problem_detected", "problem_label", "problem_description", "category", "urgency", "estimated_cost_min", "estimated_cost_max", "professional_type", "priority_actions", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "diagnostic_visuel" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur d'analyse" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Aucun diagnostic généré" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const diagnostic = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ diagnostic }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[visual-search] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
