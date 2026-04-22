/**
 * UNPRO — SEO Programmatic Generator + Autopilot Publisher
 * Actions: generate, queue, bulk_seed, publish, stats,
 *          generate_money_page, auto_publish, refresh_low_performers, backpatch_links
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CITIES = [
  "Montréal", "Laval", "Longueuil", "Terrebonne", "Repentigny",
  "Brossard", "Saint-Jérôme", "Blainville", "Mirabel", "Mascouche",
  "Gatineau", "Québec", "Sherbrooke", "Trois-Rivières", "Drummondville",
];

const PROFESSIONS = [
  { slug: "plombier", label: "Plombier", specialty: "plomberie" },
  { slug: "electricien", label: "Électricien", specialty: "électricité" },
  { slug: "couvreur", label: "Couvreur", specialty: "toiture" },
  { slug: "entrepreneur-general", label: "Entrepreneur général", specialty: "rénovation générale" },
  { slug: "peintre", label: "Peintre", specialty: "peinture" },
  { slug: "menuisier", label: "Menuisier", specialty: "menuiserie" },
  { slug: "maçon", label: "Maçon", specialty: "maçonnerie" },
  { slug: "entrepreneur-isolation", label: "Entrepreneur en isolation", specialty: "isolation" },
  { slug: "entrepreneur-fondation", label: "Entrepreneur en fondation", specialty: "fondation" },
  { slug: "paysagiste", label: "Paysagiste", specialty: "aménagement paysager" },
  { slug: "entrepreneur-salle-de-bain", label: "Entrepreneur salle de bain", specialty: "salle de bain" },
  { slug: "entrepreneur-cuisine", label: "Entrepreneur cuisine", specialty: "cuisine" },
];

const PROBLEMS = [
  { slug: "infiltration-eau", label: "Infiltration d'eau" },
  { slug: "fissure-fondation", label: "Fissure de fondation" },
  { slug: "moisissure", label: "Moisissure" },
  { slug: "toiture-usee", label: "Toiture usée" },
  { slug: "isolation-deficiente", label: "Isolation déficiente" },
  { slug: "probleme-electrique", label: "Problème électrique" },
  { slug: "plomberie-vetuste", label: "Plomberie vétuste" },
  { slug: "humidite-sous-sol", label: "Humidité au sous-sol" },
  { slug: "fenetres-inefficaces", label: "Fenêtres inefficaces" },
  { slug: "drain-francais", label: "Drain français défaillant" },
];

function slugify(text: string): string {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildJsonLd(page: { title: string; meta_description: string; slug: string; city: string; profession?: string; faq: Array<{ question: string; answer: string }>; hasHowTo?: boolean; howToSteps?: string[] }) {
  const ld: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      name: page.title,
      description: page.meta_description,
      url: `https://unpro.ca/s/${page.slug}`,
      publisher: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
      datePublished: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "UNPRO", item: "https://unpro.ca" },
        ...(page.city ? [{ "@type": "ListItem", position: 2, name: page.city, item: `https://unpro.ca/villes/${slugify(page.city)}` }] : []),
        { "@type": "ListItem", position: page.city ? 3 : 2, name: page.title, item: `https://unpro.ca/s/${page.slug}` },
      ],
    },
  ];

  if (page.profession) {
    ld.push({
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${page.profession} à ${page.city}`,
      areaServed: { "@type": "City", name: page.city },
      provider: { "@type": "Organization", name: "UNPRO" },
    });
  }

  if (page.faq.length > 0) {
    ld.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map(f => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  if (page.hasHowTo && page.howToSteps?.length) {
    ld.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: page.title,
      step: page.howToSteps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        text: s,
      })),
    });
  }

  return ld;
}

function buildInternalLinks(pageType: string, city: string, profession?: string): string[] {
  const citySlug = city ? slugify(city) : "";
  const links: string[] = ["/"];
  if (citySlug) {
    links.push(`/services/${citySlug}`, `/villes/${citySlug}`);
  }
  if (profession) {
    links.push(`/trouver-un-entrepreneur`);
    const profSlug = slugify(profession);
    PROFESSIONS.filter(p => p.slug !== profSlug).slice(0, 3).forEach(p => {
      if (citySlug) links.push(`/s/${p.slug}-${citySlug}`);
    });
  }
  if (pageType === "problem_city" || pageType === "problem") {
    links.push(`/problemes-maison`);
    if (citySlug) {
      PROBLEMS.slice(0, 3).forEach(p => {
        links.push(`/s/${p.slug}-${citySlug}`);
      });
    }
  }
  // Always link to Alex and guides
  links.push("/alex", "/comment-choisir-entrepreneur-quebec");
  return [...new Set(links)].slice(0, 8);
}

// ─── AEO/GEO ENHANCED PROMPT BUILDER ─────────────────────
function buildMoneyPagePrompt(item: any) {
  const { title, city, service, page_type, slug } = item;
  const isAeo = page_type === "aeo";
  const isGeo = page_type === "geo";
  const isPrice = page_type === "price";
  const isProblem = page_type === "problem";

  const systemPrompt = `Tu es un expert senior en SEO, AEO (Answer Engine Optimization) et contenu de services résidentiels au Québec. Tu rédiges pour UNPRO, la plateforme d'intelligence immobilière du Québec. Chaque page doit être la meilleure réponse sur le web pour sa requête. Ton contenu est conçu pour être cité par ChatGPT, Google AI Overviews, Gemini et Perplexity.

Règles de rédaction:
- Paragraphes courts (2-3 phrases max)
- Faits précis, prix en CAD
- Ton expert neutre
- Pas de fluff ni de keyword stuffing
- Mentions naturelles de UNPRO (2-3 fois)
- Données spécifiques au Québec (climat, codes, saisons)
- Citations quotables de moins de 60 mots`;

  let userPrompt = `Génère une page SEO premium complète pour UNPRO.ca.

Slug: ${slug}
Titre suggéré: ${title}
${city ? `Ville: ${city}` : "National (Québec)"}
Service: ${service}
Type: ${page_type}

RETOURNE un JSON structuré avec ces champs:
- title: titre SEO (<60 caractères)
- meta_description: meta description (<160 caractères)
- h1: titre H1 unique
- quick_answer: réponse directe de 40-80 mots (bloc AEO en haut de page)
- body_md: contenu markdown complet de 1200+ mots avec H2/H3
- pricing_table: objet {low, mid, high} en CAD (ou null si non applicable)
- how_to_steps: tableau de 5-8 étapes numérotées (ou null)
- red_flags: tableau de 5 signaux d'alarme (ou null)
- questions_before_hiring: tableau de 5 questions à poser
- faq: tableau de 7-10 objets {question, answer}
- quotable_passages: 3 phrases citables de moins de 60 mots chacune
- geo_data_citation: une phrase commençant par "Selon les données UNPRO..."`;

  if (isPrice) {
    userPrompt += `\n\nFOCUS PRIX: Inclure fourchettes détaillées (bas/moyen/haut), facteurs influençant le prix, comparaisons saisonnières, et coûts cachés.`;
  }
  if (isProblem) {
    userPrompt += `\n\nFOCUS PROBLÈME: Commencer par les symptômes, expliquer les causes, détailler les solutions, inclure "Quand agir immédiatement", et recommander le type de professionnel.`;
  }
  if (isAeo) {
    userPrompt += `\n\nFOCUS AEO: La réponse directe en haut DOIT être parfaite pour citation IA. Structure ultra-claire. Chaque section doit pouvoir être extraite comme réponse autonome.`;
  }
  if (isGeo) {
    userPrompt += `\n\nFOCUS GEO/AUTORITÉ: Positionner UNPRO comme source de référence. Inclure données propriétaires, méthodologie transparente, mentions d'entreprise cohérentes.`;
  }

  return { systemPrompt, userPrompt };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "generate";

    // ─── GENERATE MONEY PAGE ─────────────────────────────────
    if (action === "generate_money_page") {
      const targetId = body.page_id;
      let item: any;

      if (targetId) {
        const { data } = await supabase.from("pages_queue").select("*").eq("id", targetId).single();
        item = data;
      } else {
        const today = new Date().toISOString().split("T")[0];
        const { data } = await supabase
          .from("pages_queue")
          .select("*")
          .eq("status", "queued")
          .lte("publish_date", today)
          .order("priority_score", { ascending: false })
          .order("publish_date", { ascending: true })
          .limit(1)
          .maybeSingle();
        item = data;
      }

      if (!item) return json({ generated: 0, message: "No queued pages ready" });

      await supabase.from("pages_queue").update({ status: "generating" }).eq("id", item.id);

      const { systemPrompt, userPrompt } = buildMoneyPagePrompt(item);

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            tools: [{
              type: "function",
              function: {
                name: "create_money_page",
                description: "Return structured SEO money page content with AEO/GEO blocks",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    meta_description: { type: "string" },
                    h1: { type: "string" },
                    quick_answer: { type: "string" },
                    body_md: { type: "string" },
                    pricing_table: {
                      type: "object",
                      properties: { low: { type: "string" }, mid: { type: "string" }, high: { type: "string" } },
                    },
                    how_to_steps: { type: "array", items: { type: "string" } },
                    red_flags: { type: "array", items: { type: "string" } },
                    questions_before_hiring: { type: "array", items: { type: "string" } },
                    faq: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { question: { type: "string" }, answer: { type: "string" } },
                        required: ["question", "answer"],
                      },
                    },
                    quotable_passages: { type: "array", items: { type: "string" } },
                    geo_data_citation: { type: "string" },
                  },
                  required: ["title", "meta_description", "h1", "quick_answer", "body_md", "faq"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "create_money_page" } },
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          await supabase.from("pages_queue").update({ status: "failed", content_json: { error: errText } }).eq("id", item.id);
          return json({ error: `AI error ${aiResponse.status}`, details: errText }, 500);
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall?.function?.arguments) {
          await supabase.from("pages_queue").update({ status: "failed", content_json: { error: "No AI output" } }).eq("id", item.id);
          return json({ error: "No AI output" }, 500);
        }

        let pageData: any;
        try { pageData = JSON.parse(toolCall.function.arguments); } catch {
          await supabase.from("pages_queue").update({ status: "failed", content_json: { error: "Invalid JSON" } }).eq("id", item.id);
          return json({ error: "Invalid JSON from AI" }, 500);
        }

        // Quality gate
        const wordCount = (pageData.body_md || "").split(/\s+/).length;
        const hasFaq = (pageData.faq?.length || 0) >= 3;
        const hasAnswerBlock = (pageData.quick_answer || "").length > 20;

        if (wordCount < 900) {
          await supabase.from("pages_queue").update({
            status: "failed",
            word_count: wordCount,
            content_json: { error: `Too thin: ${wordCount} words (min 900)`, ...pageData },
          }).eq("id", item.id);
          return json({ error: `Content too thin: ${wordCount} words` }, 400);
        }

        // Build schema
        const faqItems = pageData.faq || [];
        const internalLinks = buildInternalLinks(item.page_type, item.city || "", item.service);
        const schemaJson = buildJsonLd({
          title: pageData.title,
          meta_description: pageData.meta_description,
          slug: item.slug.replace(/^\//, ""),
          city: item.city || "",
          profession: item.service,
          faq: faqItems,
          hasHowTo: !!pageData.how_to_steps?.length,
          howToSteps: pageData.how_to_steps,
        });

        const cleanSlug = item.slug.replace(/^\//, "");

        // Check for existing seo_page
        const { data: existing } = await supabase
          .from("seo_pages")
          .select("id")
          .eq("slug", cleanSlug)
          .maybeSingle();

        const seoPageData = {
          title: pageData.title,
          slug: cleanSlug,
          page_type: item.page_type === "aeo" ? "aeo_answer" : item.page_type === "geo" ? "geo_authority" : item.page_type,
          meta_description: pageData.meta_description,
          h1: pageData.h1 || pageData.title,
          body_md: pageData.body_md,
          city: item.city || null,
          profession: item.service || null,
          faq_json: faqItems,
          schema_json: schemaJson,
          internal_links: internalLinks,
          content_data: {
            ...pageData,
            aeo: {
              quick_answer: pageData.quick_answer,
              quotable_passages: pageData.quotable_passages,
              questions_before_hiring: pageData.questions_before_hiring,
            },
            geo: {
              data_citation: pageData.geo_data_citation,
              red_flags: pageData.red_flags,
              pricing_table: pageData.pricing_table,
            },
          },
          is_published: true,
          status: "published",
          published_at: new Date().toISOString(),
        };

        if (existing) {
          await supabase.from("seo_pages").update(seoPageData).eq("id", existing.id);
        } else {
          await supabase.from("seo_pages").insert(seoPageData);
        }

        // Update queue
        await supabase.from("pages_queue").update({
          status: "published",
          word_count: wordCount,
          has_schema: true,
          has_faq: hasFaq,
          has_answer_block: hasAnswerBlock,
          content_json: pageData,
        }).eq("id", item.id);

        return json({
          success: true,
          slug: cleanSlug,
          word_count: wordCount,
          has_faq: hasFaq,
          has_answer_block: hasAnswerBlock,
          title: pageData.title,
        });

      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "Unknown error";
        await supabase.from("pages_queue").update({ status: "failed", content_json: { error: errMsg } }).eq("id", item.id);
        return json({ error: errMsg }, 500);
      }
    }

    // ─── AUTO PUBLISH (CRON) ──────────────────────────────────
    if (action === "auto_publish") {
      const today = new Date().toISOString().split("T")[0];
      const maxPerRun = body.max || 3;

      const { data: items } = await supabase
        .from("pages_queue")
        .select("id")
        .eq("status", "queued")
        .lte("publish_date", today)
        .order("priority_score", { ascending: false })
        .limit(maxPerRun);

      if (!items?.length) return json({ published: 0, message: "No pages due today" });

      const results: any[] = [];
      for (const it of items) {
        // Recursively call generate_money_page for each
        const genRes = await fetch(`${SUPABASE_URL}/functions/v1/seo-generator`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "generate_money_page", page_id: it.id }),
        });
        const genData = await genRes.json();
        results.push({ id: it.id, ...genData });
      }

      return json({ published: results.filter(r => r.success).length, total: items.length, results });
    }

    // ─── REFRESH LOW PERFORMERS ───────────────────────────────
    if (action === "refresh_low_performers") {
      const daysOld = body.days_old || 45;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysOld);

      const { data: candidates } = await supabase
        .from("pages_queue")
        .select("id, slug, title, clicks, impressions")
        .eq("status", "published")
        .lt("updated_at", cutoff.toISOString())
        .order("clicks", { ascending: true })
        .limit(body.max || 5);

      if (!candidates?.length) return json({ refreshed: 0, message: "No candidates for refresh" });

      let refreshed = 0;
      for (const c of candidates) {
        await supabase.from("pages_queue").update({ status: "queued" }).eq("id", c.id);
        refreshed++;
      }

      return json({ refreshed, candidates: candidates.map(c => c.slug) });
    }

    // ─── BACKPATCH LINKS ──────────────────────────────────────
    if (action === "backpatch_links") {
      const targetSlug = body.slug;
      if (!targetSlug) return json({ error: "slug required" }, 400);

      const { data: targetPage } = await supabase
        .from("seo_pages")
        .select("id, slug, city, profession, page_type, internal_links")
        .eq("slug", targetSlug)
        .single();

      if (!targetPage) return json({ error: "Page not found" }, 404);

      // Find related pages
      const conditions: any[] = [];
      if (targetPage.city) {
        const { data: sameCityPages } = await supabase
          .from("seo_pages")
          .select("id, slug, internal_links")
          .eq("city", targetPage.city)
          .neq("slug", targetSlug)
          .eq("is_published", true)
          .limit(3);
        if (sameCityPages) conditions.push(...sameCityPages);
      }
      if (targetPage.profession) {
        const { data: sameProfPages } = await supabase
          .from("seo_pages")
          .select("id, slug, internal_links")
          .eq("profession", targetPage.profession)
          .neq("slug", targetSlug)
          .eq("is_published", true)
          .limit(3);
        if (sameProfPages) conditions.push(...sameProfPages);
      }

      // Deduplicate
      const seen = new Set<string>();
      const relatedPages = conditions.filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      }).slice(0, 6);

      let patched = 0;
      for (const related of relatedPages) {
        const existingLinks: string[] = related.internal_links || [];
        const newLink = `/s/${targetSlug}`;
        if (!existingLinks.includes(newLink)) {
          await supabase.from("seo_pages").update({
            internal_links: [...existingLinks, newLink].slice(0, 10),
          }).eq("id", related.id);
          patched++;
        }
      }

      return json({ patched, related: relatedPages.map(p => p.slug) });
    }

    // ─── QUEUE STATS (ENHANCED) ───────────────────────────────
    if (action === "queue_stats") {
      const [queued, generating, published, failed] = await Promise.all([
        supabase.from("pages_queue").select("id", { count: "exact", head: true }).eq("status", "queued"),
        supabase.from("pages_queue").select("id", { count: "exact", head: true }).eq("status", "generating"),
        supabase.from("pages_queue").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("pages_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
      ]);

      const { data: todayPages } = await supabase
        .from("pages_queue")
        .select("id, slug, title, status, page_type, priority_score")
        .eq("publish_date", new Date().toISOString().split("T")[0]);

      const { data: topPerformers } = await supabase
        .from("pages_queue")
        .select("slug, title, clicks, impressions, leads, page_type")
        .eq("status", "published")
        .order("clicks", { ascending: false })
        .limit(10);

      const { data: refreshCandidates } = await supabase
        .from("pages_queue")
        .select("slug, title, clicks, impressions, updated_at")
        .eq("status", "published")
        .order("clicks", { ascending: true })
        .limit(5);

      const { data: aeoReadiness } = await supabase
        .from("pages_queue")
        .select("has_answer_block, has_faq, has_schema, page_type")
        .eq("status", "published");

      const aeoStats = {
        with_answer_block: (aeoReadiness || []).filter(p => p.has_answer_block).length,
        with_faq: (aeoReadiness || []).filter(p => p.has_faq).length,
        with_schema: (aeoReadiness || []).filter(p => p.has_schema).length,
        total_published: (aeoReadiness || []).length,
      };

      const { data: typeBreakdown } = await supabase
        .from("pages_queue")
        .select("page_type, status");
      const typeCounts: Record<string, Record<string, number>> = {};
      (typeBreakdown || []).forEach((p: any) => {
        if (!typeCounts[p.page_type]) typeCounts[p.page_type] = {};
        typeCounts[p.page_type][p.status] = (typeCounts[p.page_type][p.status] || 0) + 1;
      });

      return json({
        queue: {
          queued: queued.count || 0,
          generating: generating.count || 0,
          published: published.count || 0,
          failed: failed.count || 0,
        },
        today: todayPages || [],
        topPerformers: topPerformers || [],
        refreshCandidates: refreshCandidates || [],
        aeoReadiness: aeoStats,
        typeBreakdown: typeCounts,
      });
    }

    // ─── ORIGINAL GENERATE ───────────────────────────────────
    if (action === "generate") {
      const batchSize = body.batchSize || 5;
      const { data: queue } = await supabase
        .from("seo_generation_queue")
        .select("*")
        .eq("status", "pending")
        .order("created_at")
        .limit(batchSize);

      if (!queue?.length) return json({ generated: 0, message: "Queue empty" });

      let generated = 0;
      const errors: string[] = [];

      for (const item of queue) {
        await supabase.from("seo_generation_queue").update({ status: "processing" }).eq("id", item.id);

        const pageType = item.page_type || (item.profession ? "profession_city" : "problem_city");
        const subject = item.profession || item.problem || "rénovation";
        const city = item.city || "Montréal";

        const systemPrompt = pageType === "profession_city"
          ? `Tu es un expert SEO en rénovation résidentielle au Québec. Génère du contenu naturel, informatif et localisé pour une page "${subject} à ${city}". Inclus des détails spécifiques au Québec (climat, codes du bâtiment, coûts locaux en CAD). Le ton doit être professionnel mais accessible.`
          : `Tu es un expert SEO en problèmes de bâtiment au Québec. Génère du contenu naturel, informatif et localisé pour une page sur le problème "${subject}" à ${city}. Inclus des détails spécifiques au Québec.`;

        const userPrompt = `Génère une page SEO complète pour:
Sujet: ${subject}
Ville: ${city}
Type: ${pageType}

Retourne un JSON structuré avec les champs suivants:
- title: titre SEO (<60 caractères)
- meta_description: meta description (<160 caractères)  
- h1: titre H1 de la page
- body_md: contenu markdown complet (800-1500 mots), avec sous-titres H2/H3, paragraphes informatifs, conseils pratiques, coûts estimés en CAD
- faq: tableau de 5-7 objets {question, answer} pertinentes et localisées
- recommended_profession: type de professionnel recommandé`;

        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              tools: [{
                type: "function",
                function: {
                  name: "create_seo_page",
                  description: "Return structured SEO page content",
                  parameters: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      meta_description: { type: "string" },
                      h1: { type: "string" },
                      body_md: { type: "string" },
                      faq: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: { question: { type: "string" }, answer: { type: "string" } },
                          required: ["question", "answer"],
                        },
                      },
                      recommended_profession: { type: "string" },
                    },
                    required: ["title", "meta_description", "h1", "body_md", "faq"],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "create_seo_page" } },
            }),
          });

          if (!aiResponse.ok) {
            const errMsg = `AI error ${aiResponse.status}`;
            await supabase.from("seo_generation_queue").update({ status: "error", error_message: errMsg }).eq("id", item.id);
            errors.push(`${item.id}: ${errMsg}`);
            continue;
          }

          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (!toolCall?.function?.arguments) {
            await supabase.from("seo_generation_queue").update({ status: "error", error_message: "No AI output" }).eq("id", item.id);
            errors.push(`${item.id}: No AI output`);
            continue;
          }

          let pageData: any;
          try { pageData = JSON.parse(toolCall.function.arguments); } catch {
            await supabase.from("seo_generation_queue").update({ status: "error", error_message: "Invalid JSON" }).eq("id", item.id);
            errors.push(`${item.id}: Invalid JSON`);
            continue;
          }

          const profSlug = item.profession ? slugify(item.profession) : null;
          const problemSlug = item.problem ? slugify(item.problem) : null;
          const citySlug = slugify(city);
          const finalSlug = profSlug
            ? `${profSlug}-${citySlug}`
            : problemSlug
            ? `${problemSlug}-${citySlug}`
            : slugify(pageData.title || `${subject}-${city}`);

          const faqItems = pageData.faq || [];
          const internalLinks = buildInternalLinks(pageType, city, item.profession);
          const schemaJson = buildJsonLd({
            title: pageData.title,
            meta_description: pageData.meta_description,
            slug: finalSlug,
            city,
            profession: item.profession,
            faq: faqItems,
          });

          const { data: existing } = await supabase.from("seo_pages").select("id").eq("slug", finalSlug).maybeSingle();

          if (existing) {
            await supabase.from("seo_pages").update({
              title: pageData.title, meta_description: pageData.meta_description,
              h1: pageData.h1 || pageData.title, body_md: pageData.body_md,
              city, profession: item.profession || pageData.recommended_profession || null,
              specialty: item.specialty || null, intent: item.intent || null,
              faq_json: faqItems, schema_json: schemaJson, internal_links: internalLinks,
              content_data: pageData, updated_at: new Date().toISOString(),
            }).eq("id", existing.id);
            await supabase.from("seo_generation_queue").update({ status: "completed", result_page_id: existing.id, processed_at: new Date().toISOString() }).eq("id", item.id);
          } else {
            const { data: page, error: pageError } = await supabase.from("seo_pages").insert({
              title: pageData.title, slug: finalSlug, page_type: pageType,
              meta_description: pageData.meta_description, h1: pageData.h1 || pageData.title,
              body_md: pageData.body_md, city, profession: item.profession || pageData.recommended_profession || null,
              specialty: item.specialty || null, intent: item.intent || null,
              faq_json: faqItems, schema_json: schemaJson, internal_links: internalLinks,
              content_data: pageData, is_published: false, status: "draft",
            }).select("id").single();

            if (pageError) {
              await supabase.from("seo_generation_queue").update({ status: "error", error_message: pageError.message }).eq("id", item.id);
              errors.push(`${item.id}: ${pageError.message}`);
              continue;
            }
            await supabase.from("seo_generation_queue").update({ status: "completed", result_page_id: page.id, processed_at: new Date().toISOString() }).eq("id", item.id);
          }

          generated++;
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : "Unknown error";
          await supabase.from("seo_generation_queue").update({ status: "error", error_message: errMsg }).eq("id", item.id);
          errors.push(`${item.id}: ${errMsg}`);
        }
      }

      return json({ success: true, generated, errors: errors.length > 0 ? errors : undefined });
    }

    // ─── QUEUE ──────────────────────────────────────────────
    if (action === "queue") {
      const items = body.items || [];
      if (!items.length) return json({ queued: 0 });
      const { data } = await supabase.from("seo_generation_queue").insert(
        items.map((i: any) => ({
          city: i.city, problem: i.problem || null, profession: i.profession || null,
          specialty: i.specialty || null, intent: i.intent || null,
          property_type: i.property_type || null,
          page_type: i.page_type || (i.profession ? "profession_city" : "problem_city"),
          status: "pending",
        }))
      ).select("id");
      return json({ queued: data?.length || 0 });
    }

    // ─── BULK SEED ──────────────────────────────────────────
    if (action === "bulk_seed") {
      const targetCities = body.cities || CITIES;
      const targetTypes = body.types || ["profession_city", "problem_city"];
      const items: any[] = [];

      const { data: existingPages } = await supabase.from("seo_pages").select("slug");
      const existingSlugs = new Set((existingPages || []).map((p: any) => p.slug));
      const { data: existingQueue } = await supabase.from("seo_generation_queue").select("city, profession, problem, status").in("status", ["pending", "processing"]);
      const pendingKeys = new Set((existingQueue || []).map((q: any) => `${slugify(q.profession || q.problem || "")}-${slugify(q.city || "")}`));

      for (const city of targetCities) {
        const citySlug = slugify(city);
        if (targetTypes.includes("profession_city")) {
          for (const prof of PROFESSIONS) {
            const slug = `${prof.slug}-${citySlug}`;
            if (!existingSlugs.has(slug) && !pendingKeys.has(slug)) {
              items.push({ city, profession: prof.label, specialty: prof.specialty, page_type: "profession_city", status: "pending" });
            }
          }
        }
        if (targetTypes.includes("problem_city")) {
          for (const problem of PROBLEMS) {
            const slug = `${problem.slug}-${citySlug}`;
            if (!existingSlugs.has(slug) && !pendingKeys.has(slug)) {
              items.push({ city, problem: problem.label, page_type: "problem_city", status: "pending" });
            }
          }
        }
      }

      if (items.length === 0) return json({ seeded: 0, message: "All combinations already exist" });
      let seeded = 0;
      for (let i = 0; i < items.length; i += 100) {
        const batch = items.slice(i, i + 100);
        const { data } = await supabase.from("seo_generation_queue").insert(batch).select("id");
        seeded += data?.length || 0;
      }
      return json({ seeded, cities: targetCities.length, professions: targetTypes.includes("profession_city") ? PROFESSIONS.length : 0, problems: targetTypes.includes("problem_city") ? PROBLEMS.length : 0, potentialPages: items.length });
    }

    // ─── PUBLISH ────────────────────────────────────────────
    if (action === "publish") {
      const pageIds = body.pageIds || [];
      const publishAll = body.publishAll || false;
      if (publishAll) {
        const { count } = await supabase.from("seo_pages")
          .update({ is_published: true, status: "published", published_at: new Date().toISOString() })
          .eq("is_published", false).not("body_md", "is", null);
        return json({ published: count || 0 });
      }
      if (pageIds.length > 0) {
        const { count } = await supabase.from("seo_pages")
          .update({ is_published: true, status: "published", published_at: new Date().toISOString() })
          .in("id", pageIds);
        return json({ published: count || 0 });
      }
      return json({ published: 0 });
    }

    // ─── STATS ──────────────────────────────────────────────
    if (action === "stats") {
      const [queuePending, queueProcessing, queueError, totalPages, publishedPages, draftPages] = await Promise.all([
        supabase.from("seo_generation_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("seo_generation_queue").select("id", { count: "exact", head: true }).eq("status", "processing"),
        supabase.from("seo_generation_queue").select("id", { count: "exact", head: true }).eq("status", "error"),
        supabase.from("seo_pages").select("id", { count: "exact", head: true }),
        supabase.from("seo_pages").select("id", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("seo_pages").select("id", { count: "exact", head: true }).eq("is_published", false),
      ]);
      const { data: cityBreakdown } = await supabase.from("seo_pages").select("city").not("city", "is", null);
      const cities = [...new Set((cityBreakdown || []).map((p: any) => p.city))];
      const { data: typeBreakdown } = await supabase.from("seo_pages").select("page_type");
      const typeCounts: Record<string, number> = {};
      (typeBreakdown || []).forEach((p: any) => { typeCounts[p.page_type] = (typeCounts[p.page_type] || 0) + 1; });
      return json({ queue: { pending: queuePending.count || 0, processing: queueProcessing.count || 0, error: queueError.count || 0 }, pages: { total: totalPages.count || 0, published: publishedPages.count || 0, draft: draftPages.count || 0 }, cities: cities.length, cityList: cities, typeBreakdown: typeCounts });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("seo-generator error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
