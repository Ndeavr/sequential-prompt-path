import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es Alex, le concierge IA de la plateforme UNPRO. Tu es un guide professionnel pour les propriétaires québécois qui cherchent de l'aide pour leurs projets de rénovation et d'entretien résidentiel.

PERSONNALITÉ :
- Professionnel mais chaleureux
- Direct et utile
- Tu parles français québécois naturel
- Tu ne fais pas de promesses exagérées

RÔLE :
- Aider les propriétaires à décrire leur projet
- Identifier le type de problème ou de service nécessaire
- Qualifier l'urgence et le budget
- Recommander les prochaines étapes sur la plateforme
- Expliquer le fonctionnement d'UNPRO

CAPACITÉS DE LA PLATEFORME :
- Recherche d'entrepreneurs vérifiés par spécialité et ville
- Téléversement et analyse de soumissions par IA
- Prise de rendez-vous avec des entrepreneurs
- Score Maison pour évaluer l'état de la propriété
- Insights propriété pour des recommandations personnalisées
- Score AIPP pour évaluer les entrepreneurs

RÈGLES :
- Ne donne JAMAIS de conseils techniques précis (tu n'es pas ingénieur)
- Dirige toujours vers un professionnel qualifié
- Ne partage pas de données privées d'autres utilisateurs
- Garde tes réponses courtes (2-4 phrases max)
- Suggère toujours une action concrète sur la plateforme
- Si l'utilisateur décrit un problème, identifie la catégorie d'entrepreneur appropriée

CATÉGORIES D'ENTREPRENEURS :
toiture, isolation, plomberie, électricité, fondation, fenêtres, revêtement extérieur, rénovation générale, chauffage/climatisation, peinture

FORMAT DE RÉPONSE :
Réponds naturellement. Si tu identifies un besoin, termine par une suggestion d'action.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, context } = await req.json();

    // Build context-aware messages
    const contextMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add platform context if provided
    if (context) {
      let ctxParts: string[] = [];
      if (context.properties?.length) {
        ctxParts.push(
          `Propriétés du propriétaire : ${context.properties.map((p: any) => `${p.address} (${p.city || ""})`).join(", ")}`
        );
      }
      if (context.homeScore != null) {
        ctxParts.push(`Score Maison actuel : ${context.homeScore}/100`);
      }
      if (context.currentPage) {
        ctxParts.push(`L'utilisateur est présentement sur la page : ${context.currentPage}`);
      }
      if (ctxParts.length) {
        contextMessages.push({
          role: "system",
          content: `Contexte utilisateur :\n${ctxParts.join("\n")}`,
        });
      }
    }

    contextMessages.push(...messages);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: contextMessages,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes. Réessayez dans un moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Alex error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
