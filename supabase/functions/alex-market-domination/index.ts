/**
 * UNPRO — Alex Market Domination Edge Function
 * AI-powered content generation, profile optimization, and competitive analysis.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, city, service, problem, contractorId, limit } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    switch (action) {
      case "generate_service_page": {
        const content = await generateWithAI(city, service, "service_page");
        return json({ success: true, data: content });
      }

      case "generate_problem_page": {
        const content = await generateWithAI(city, service, "problem_page", problem);
        return json({ success: true, data: content });
      }

      case "optimize_profile": {
        if (!contractorId) return json({ success: false, error: "contractorId required" }, 400);

        const { data: contractor } = await supabase
          .from("contractors")
          .select("*")
          .eq("id", contractorId)
          .single();

        if (!contractor) return json({ success: false, error: "Contractor not found" }, 404);

        const optimization = generateProfileOptimization(contractor);
        return json({ success: true, data: optimization });
      }

      case "analyze_competition": {
        const gaps = analyzeCompetitiveGaps(city, service);
        return json({ success: true, data: gaps });
      }

      case "generate_clusters": {
        const clusters = generateLocalClusters(city, limit || 5);
        return json({ success: true, data: clusters });
      }

      case "generate_schema": {
        const schema = generateSchemaMarkup(city, service, problem);
        return json({ success: true, data: schema });
      }

      case "seo_insights": {
        const insights = generateSeoInsights(city);
        return json({ success: true, data: insights });
      }

      default:
        return json({ success: false, error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    console.error("Market domination error:", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

// ─── Helpers ────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CITIES: Record<string, string> = {
  laval: "Laval", montreal: "Montréal", longueuil: "Longueuil",
  terrebonne: "Terrebonne", brossard: "Brossard",
};

const SERVICES: Record<string, string> = {
  toiture: "Toiture", isolation: "Isolation", plomberie: "Plomberie",
  electricite: "Électricité", peinture: "Peinture", maconnerie: "Maçonnerie",
  pavage: "Pavage", fenetres: "Portes et fenêtres",
  climatisation: "Climatisation", amenagement: "Aménagement paysager",
};

async function generateWithAI(
  city: string, service: string, pageType: string, problem?: string
) {
  const cityLabel = CITIES[city] || city;
  const serviceLabel = SERVICES[service] || service;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    // Fallback to template-based generation
    return generateTemplateContent(city, cityLabel, service, serviceLabel, pageType, problem);
  }

  const systemPrompt = `Tu es un expert en contenu SEO/AEO pour les services résidentiels au Québec.
Génère du contenu en français, optimisé pour Google et les moteurs IA (ChatGPT, Gemini, Perplexity).
Règles: 
- Phrases courtes et claires
- Données locales crédibles
- FAQ riches et directes
- Structure logique avec H2/H3
- Ton professionnel mais accessible
- Mots-clés naturellement intégrés
- Jamais de keyword stuffing
- Contenu utile et actionnable`;

  const userPrompt = pageType === "problem_page"
    ? `Génère une page complète sur le problème "${problem}" pour le service "${serviceLabel}" à ${cityLabel}. 
Inclus: introduction, causes, solutions, coûts estimés, checklist, FAQ (5 questions), et CTA.
Retourne en JSON: { title, h1, metaDescription, sections: [{heading, body}], faq: [{question, answer}] }`
    : `Génère une page de service complète pour "${serviceLabel}" à ${cityLabel}.
Inclus: introduction, comment choisir, spécificités locales, prix moyens, pourquoi UNPRO, FAQ (5 questions), CTA.
Retourne en JSON: { title, h1, metaDescription, sections: [{heading, body}], faq: [{question, answer}] }`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_seo_page",
            description: "Generate structured SEO page content",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                h1: { type: "string" },
                metaDescription: { type: "string" },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      heading: { type: "string" },
                      body: { type: "string" },
                    },
                    required: ["heading", "body"],
                  },
                },
                faq: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      answer: { type: "string" },
                    },
                    required: ["question", "answer"],
                  },
                },
              },
              required: ["title", "h1", "metaDescription", "sections", "faq"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_seo_page" } },
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return generateTemplateContent(city, cityLabel, service, serviceLabel, pageType, problem);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return {
        ...parsed,
        generatedBy: "ai",
        schemaJsonLd: generateSchemaMarkup(city, service, problem),
      };
    }

    return generateTemplateContent(city, cityLabel, service, serviceLabel, pageType, problem);
  } catch (e) {
    console.error("AI generation failed, using template:", e);
    return generateTemplateContent(city, cityLabel, service, serviceLabel, pageType, problem);
  }
}

function generateTemplateContent(
  city: string, cityLabel: string, service: string, serviceLabel: string,
  pageType: string, problem?: string,
) {
  const title = pageType === "problem_page"
    ? `${problem || "Problème"} à ${cityLabel} — Solutions et coûts | UNPRO`
    : `${serviceLabel} à ${cityLabel} — Meilleurs professionnels | UNPRO`;

  return {
    title,
    h1: pageType === "problem_page" ? `${problem} à ${cityLabel}` : `${serviceLabel} à ${cityLabel}`,
    metaDescription: `${serviceLabel} à ${cityLabel} : professionnels vérifiés, score AIPP, avis authentiques. Comparez et réservez sur UNPRO.`,
    sections: [
      { heading: `${serviceLabel} à ${cityLabel}`, body: `Guide complet pour trouver le meilleur professionnel en ${serviceLabel.toLowerCase()} à ${cityLabel}.` },
      { heading: "Comment choisir", body: "Vérifiez licence RBQ, assurances, avis et score AIPP." },
      { heading: "Prix moyens", body: `Les prix à ${cityLabel} varient selon le projet. Comparez sur UNPRO.` },
    ],
    faq: [
      { question: `Combien coûte ${serviceLabel.toLowerCase()} à ${cityLabel} ?`, answer: "Les prix varient. Demandez des soumissions comparatives sur UNPRO." },
      { question: "Qu'est-ce que le score AIPP ?", answer: "Le score AIPP mesure la visibilité numérique et la crédibilité d'un entrepreneur sur 100." },
    ],
    generatedBy: "template",
    schemaJsonLd: generateSchemaMarkup(city, service, problem),
  };
}

function generateProfileOptimization(contractor: Record<string, unknown>) {
  const improvements = [];
  let bonusScore = 0;

  if (!contractor.bio || (contractor.bio as string).length < 50) {
    improvements.push({ field: "bio", impact: "high", action: "Ajouter une description détaillée (100+ mots)" });
    bonusScore += 8;
  }
  if (!contractor.certifications_verified) {
    improvements.push({ field: "certifications", impact: "high", action: "Vérifier et ajouter certifications RBQ" });
    bonusScore += 10;
  }

  return {
    contractorId: contractor.id,
    currentScore: contractor.aipp_overall_score || 0,
    potentialScore: Math.min(100, ((contractor.aipp_overall_score as number) || 0) + bonusScore),
    improvements,
    improvementCount: improvements.length,
  };
}

function analyzeCompetitiveGaps(city: string, service: string) {
  const cityLabel = CITIES[city] || city;
  const serviceLabel = SERVICES[service] || service;

  return [
    {
      keyword: `meilleur ${serviceLabel.toLowerCase()} ${cityLabel}`,
      opportunity: "high",
      action: "Créer page comparative avec classement AIPP",
    },
    {
      keyword: `prix ${serviceLabel.toLowerCase()} ${cityLabel} 2026`,
      opportunity: "high",
      action: "Enrichir section coûts avec fourchettes locales",
    },
    {
      keyword: `${serviceLabel.toLowerCase()} pas cher ${cityLabel}`,
      opportunity: "medium",
      action: "Créer contenu sur rapport qualité-prix",
    },
  ];
}

function generateLocalClusters(city: string, limit: number) {
  const services = Object.entries(SERVICES).slice(0, limit);
  return services.map(([slug, label]) => ({
    hub: `/villes/${city}/${slug}`,
    service: label,
    completeness: Math.floor(Math.random() * 60) + 30, // would be computed from DB
    priority: ["toiture", "plomberie", "electricite", "isolation"].includes(slug) ? "high" : "medium",
  }));
}

function generateSchemaMarkup(city: string, service: string, problem?: string) {
  const cityLabel = CITIES[city] || city;
  const serviceLabel = SERVICES[service] || service;

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${serviceLabel} à ${cityLabel}`,
      provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
      areaServed: { "@type": "City", name: cityLabel },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://unpro.ca" },
        { "@type": "ListItem", position: 2, name: cityLabel, item: `https://unpro.ca/villes/${city}` },
        { "@type": "ListItem", position: 3, name: serviceLabel },
      ],
    },
  ];

  if (problem) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "HowTo" as any,
      name: `Comment résoudre : ${problem}`,
      step: [
        { "@type": "HowToStep", text: "Documenter le problème avec photos" },
        { "@type": "HowToStep", text: "Consulter un professionnel vérifié" },
        { "@type": "HowToStep", text: "Comparer les soumissions" },
      ],
    } as any);
  }

  return schemas;
}

function generateSeoInsights(city: string) {
  const cityLabel = CITIES[city] || city;
  return {
    city: cityLabel,
    totalClusters: Object.keys(SERVICES).length,
    highPriorityClusters: 4,
    estimatedPagesNeeded: Object.keys(SERVICES).length * 5,
    topOpportunities: [
      `Pages problèmes manquantes pour ${cityLabel}`,
      "FAQ enrichies pour citation IA",
      "Schémas LocalBusiness sur profils entrepreneurs",
      "Pages comparatives par service",
    ],
    authorityLevel: "émergent",
  };
}
