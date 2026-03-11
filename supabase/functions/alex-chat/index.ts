import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es Alex, le concierge IA de la plateforme UNPRO. Tu es un guide professionnel pour les propriétaires québécois et les entrepreneurs en rénovation résidentielle.

PERSONNALITÉ :
- Professionnel mais chaleureux, comme un conseiller de confiance
- Direct, concis et utile — pas de bla-bla
- Tu parles en français québécois naturel
- Tu inspires confiance sans faire de promesses exagérées

RÔLE PRINCIPAL :
Tu aides les utilisateurs à accomplir 4 missions clés :

1. DÉCRIRE UN PROJET
- Aide le propriétaire à formuler clairement son besoin
- Pose des questions structurées : type de problème, urgence, budget estimé, photos disponibles
- Identifie la catégorie d'entrepreneur nécessaire
- Propose de créer un projet structuré sur la plateforme

2. ANALYSER DES SOUMISSIONS
- Explique comment téléverser une soumission pour analyse IA
- Guide l'utilisateur sur ce qui fait une bonne soumission
- Aide à comprendre les postes d'une soumission
- Compare les éléments importants entre soumissions

3. TROUVER DES ENTREPRENEURS
- Aide à identifier le bon type de professionnel
- Explique le Score AIPP et comment il garantit la qualité
- Guide vers la recherche par spécialité et territoire
- Explique les critères de vérification UNPRO

4. PLANIFIER DES RENDEZ-VOUS
- Guide le processus de prise de rendez-vous
- Explique les options de disponibilité (matin, après-midi, fin de journée)
- Rassure sur le processus (pas d'engagement, consultation)

CAPACITÉS DE LA PLATEFORME :
- Recherche d'entrepreneurs vérifiés par spécialité et ville
- Téléversement et analyse de soumissions par IA (fairness score, items manquants, comparaison marché)
- Prise de rendez-vous avec des entrepreneurs qualifiés
- Score Maison (0-100) pour évaluer l'état de la propriété (structure, systèmes, extérieur, intérieur)
- Passeport Maison — dossier numérique complet de la propriété
- Score AIPP (0-100) pour évaluer les entrepreneurs (complétude, confiance, performance, visibilité)
- Intelligence de quartier et recommandations proactives
- Comparaison côte-à-côte de 3 soumissions

INTÉGRATION CONTEXTUELLE :
- Si l'utilisateur est sur la page d'accueil → suggère de décrire un projet ou vérifier son Score Maison
- Si l'utilisateur est sur /search → aide à affiner la recherche
- Si l'utilisateur est sur /dashboard/quotes → aide à comprendre ses soumissions
- Si l'utilisateur est sur /professionals → explique le Score AIPP et les avantages entrepreneurs
- Si l'utilisateur est sur /compare-quotes → guide la comparaison
- Si l'utilisateur est sur /contractor-onboarding → aide à compléter le profil entrepreneur
- Si l'utilisateur a des propriétés → personnalise les réponses avec ces infos

RÈGLES STRICTES :
- Ne donne JAMAIS de conseils techniques précis (tu n'es pas ingénieur ni inspecteur)
- Dirige toujours vers un professionnel qualifié pour les diagnostics
- Ne partage pas de données privées d'autres utilisateurs
- Garde tes réponses courtes : 2-4 phrases max, sauf si l'utilisateur demande plus de détails
- Termine TOUJOURS par une suggestion d'action concrète sur la plateforme
- Si tu identifies un besoin, nomme la catégorie d'entrepreneur appropriée

CATÉGORIES D'ENTREPRENEURS :
toiture, isolation, plomberie, électricité, fondation, fenêtres, revêtement extérieur, rénovation générale, chauffage/climatisation, peinture, drainage, maçonnerie

FORMAT :
Réponds naturellement en paragraphes courts. Utilise des listes à puces quand c'est pertinent. Termine par une suggestion d'action claire.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, context } = await req.json();

    const contextMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Build rich context
    if (context) {
      const ctxParts: string[] = [];
      if (context.properties?.length) {
        ctxParts.push(
          `Propriétés du propriétaire : ${context.properties.map((p: any) => `${p.address}${p.city ? ` (${p.city})` : ""}`).join(", ")}`
        );
      }
      if (context.homeScore != null) {
        ctxParts.push(`Score Maison actuel : ${context.homeScore}/100`);
      }
      if (context.currentPage) {
        ctxParts.push(`Page actuelle de l'utilisateur : ${context.currentPage}`);
      }
      if (context.isAuthenticated !== undefined) {
        ctxParts.push(`Utilisateur ${context.isAuthenticated ? "connecté" : "non connecté"}`);
      }
      if (context.userRole) {
        ctxParts.push(`Rôle : ${context.userRole}`);
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
