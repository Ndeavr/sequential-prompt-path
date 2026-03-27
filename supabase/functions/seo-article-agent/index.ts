import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ArticleRequest {
  title: string;
  city: string;
  slug: string;
  service_category: string;
  problem_slug?: string;
}

async function generateArticle(req: ArticleRequest) {
  // 1. Fetch existing articles for internal linking
  const { data: existingArticles } = await supabase
    .from("seo_articles")
    .select("slug, title, city, service_category")
    .eq("published", true)
    .limit(50);

  const linkPool = (existingArticles || [])
    .filter((a) => a.slug !== req.slug)
    .map((a) => `- "${a.title}" → /articles/${a.slug} (${a.city}, ${a.service_category})`)
    .join("\n");

  // 2. Also fetch seo_local_pages for cross-linking
  const { data: localPages } = await supabase
    .from("seo_local_pages")
    .select("slug, city, service_category")
    .eq("published", true)
    .limit(30);

  const localLinksPool = (localPages || [])
    .map((p) => `- /services/${p.city.toLowerCase()}/${p.slug} (${p.city}, ${p.service_category})`)
    .join("\n");

  const systemPrompt = `Tu es un rédacteur SEO expert québécois pour UNPRO, plateforme d'intelligence immobilière.
Tu génères des articles de blog locaux de ~2000 mots, optimisés pour le SEO, AEO et les moteurs de réponse IA.

RÈGLES STRICTES :
- Écrire en français québécois naturel (pas de France)
- L'article doit être UNIQUE, pas générique
- Mentionner la ville naturellement (minimum 8 fois)
- Donner des exemples concrets locaux (quartiers, réalités climatiques, types de bâtiments)
- Inclure des coûts réalistes au Québec
- Ton : expert, rassurant, direct, orienté action
- Pas de faux témoignages, pas de statistiques inventées
- Chaque section doit apporter de la valeur réelle au propriétaire local

STRUCTURE OBLIGATOIRE DE L'ARTICLE :
1. Introduction accrocheuse (contexte local)
2. Comprendre le problème (causes spécifiques au Québec)
3. Signes à surveiller
4. Risques si on n'agit pas
5. Solutions recommandées
6. Coûts estimatifs au Québec
7. Quand faire appel à un professionnel
8. Prévention et entretien
9. Conclusion avec appel à l'action UNPRO

FORMAT DE SORTIE (JSON strict) :
Utilise le tool "generate_seo_article" pour retourner l'article structuré.`;

  const userPrompt = `Génère un article SEO complet pour :
Titre : "${req.title}"
Ville : ${req.city}
Catégorie : ${req.service_category}
Slug : ${req.slug}

ARTICLES EXISTANTS POUR MAILLAGE INTERNE (choisis 2-4 liens pertinents) :
${linkPool || "Aucun article existant encore."}

PAGES LOCALES EXISTANTES (choisis 1-2 liens pertinents) :
${localLinksPool || "Aucune page locale encore."}

Génère l'article maintenant avec le tool generate_seo_article.`;

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
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_seo_article",
            description: "Retourne un article SEO structuré complet avec FAQ, JSON-LD et maillage interne.",
            parameters: {
              type: "object",
              properties: {
                meta_title: { type: "string", description: "Titre SEO 55-65 chars" },
                meta_description: { type: "string", description: "Meta description 140-160 chars" },
                h1: { type: "string", description: "H1 de la page" },
                content_html: { type: "string", description: "Article complet en HTML (~2000 mots). Utiliser h2, h3, p, ul, li, strong, em. Inclure les liens internes comme <a href='...'>." },
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
                  description: "5 à 10 questions FAQ pertinentes localement",
                },
                internal_links: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      url: { type: "string" },
                      anchor: { type: "string" },
                      context: { type: "string", description: "Pourquoi ce lien est pertinent" },
                    },
                    required: ["url", "anchor"],
                  },
                  description: "2 à 4 liens internes vers d'autres articles/pages",
                },
                hero_image_prompt: { type: "string", description: "Prompt pour générer l'image héro. IMPORTANT: doit décrire une vraie photo de chantier style documentaire — éclairage naturel imparfait, vrais matériaux visibles (laine rose, OSB, charpente bois, outils), qualité photo de téléphone ou portfolio entrepreneur. PAS de studio, PAS de modèle posé, PAS d'esthétique stock photo." },
                seo_score: { type: "integer", description: "Score SEO estimé 0-100" },
                intent_score: { type: "integer", description: "Score d'intention 0-100" },
                conversion_score: { type: "integer", description: "Score de conversion 0-100" },
              },
              required: ["meta_title", "meta_description", "h1", "content_html", "faq", "internal_links", "hero_image_prompt", "seo_score", "intent_score", "conversion_score"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "generate_seo_article" } },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI gateway error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in response");

  const article = JSON.parse(toolCall.function.arguments);

  // Build JSON-LD schemas
  const wordCount = (article.content_html || "").split(/\s+/).length;
  const schemaJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.h1,
      description: article.meta_description,
      author: { "@type": "Organization", name: "UNPRO" },
      publisher: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
      datePublished: new Date().toISOString(),
      mainEntityOfPage: `https://unpro.ca/articles/${req.slug}`,
      wordCount,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (article.faq || []).map((f: any) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "ProfessionalService",
      name: "UNPRO",
      address: { "@type": "PostalAddress", addressLocality: req.city, addressRegion: "QC", addressCountry: "CA" },
      url: "https://unpro.ca",
    },
  ];

  // 3. Upsert article
  const { error } = await supabase.from("seo_articles").upsert(
    {
      slug: req.slug,
      city: req.city,
      title: req.title,
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      h1: article.h1,
      content_html: article.content_html,
      faq: article.faq,
      schema_json_ld: schemaJsonLd,
      internal_links: article.internal_links,
      service_category: req.service_category,
      problem_slug: req.problem_slug || null,
      word_count: wordCount,
      seo_score: article.seo_score,
      intent_score: article.intent_score,
      conversion_score: article.conversion_score,
      hero_image_prompt: article.hero_image_prompt,
      generation_status: "completed",
      generation_model: "google/gemini-2.5-flash",
      published: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );

  if (error) throw new Error(`DB insert error: ${error.message}`);

  return { slug: req.slug, word_count: wordCount, faq_count: (article.faq || []).length, links_count: (article.internal_links || []).length };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { articles } = await req.json() as { articles: ArticleRequest[] };
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return new Response(JSON.stringify({ error: "articles array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Process sequentially to respect rate limits
    const results = [];
    const errors = [];
    for (const art of articles) {
      try {
        // Mark as generating
        await supabase.from("seo_articles").upsert({ slug: art.slug, city: art.city, title: art.title, service_category: art.service_category, generation_status: "generating" }, { onConflict: "slug" });
        const result = await generateArticle(art);
        results.push(result);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push({ slug: art.slug, error: msg });
        await supabase.from("seo_articles").update({ generation_status: "failed" }).eq("slug", art.slug);
      }
    }

    // Log batch
    await supabase.from("seo_local_generation_logs").insert({
      batch_name: `articles-${new Date().toISOString().slice(0, 10)}`,
      city: articles[0]?.city || "mixed",
      total_pages: results.length,
      status: errors.length === 0 ? "completed" : "partial",
      notes: errors.length > 0 ? `${errors.length} erreurs: ${errors.map((e) => e.slug).join(", ")}` : null,
    });

    return new Response(JSON.stringify({ success: results.length, failed: errors.length, results, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seo-article-agent error:", e);
    const status = e instanceof Error && e.message.includes("429") ? 429 : e instanceof Error && e.message.includes("402") ? 402 : 500;
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
