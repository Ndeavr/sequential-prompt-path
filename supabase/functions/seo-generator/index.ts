/**
 * UNPRO — SEO Programmatic Generator
 * Generates city×profession SEO pages with AI content, FAQ, JSON-LD, internal links.
 * Actions: generate, queue, bulk_seed, publish, stats
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

function buildJsonLd(page: { title: string; meta_description: string; slug: string; city: string; profession?: string; faq: Array<{ question: string; answer: string }> }) {
  const ld: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      description: page.meta_description,
      url: `https://unpro.ca/s/${page.slug}`,
      publisher: {
        "@type": "Organization",
        name: "UNPRO",
        url: "https://unpro.ca",
      },
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

  return ld;
}

function buildInternalLinks(pageType: string, city: string, profession?: string): string[] {
  const citySlug = slugify(city);
  const links: string[] = [
    `/services/${citySlug}`,
    `/villes/${citySlug}`,
  ];

  if (profession) {
    links.push(`/trouver-un-entrepreneur`);
    const profSlug = slugify(profession);
    // Add related profession pages for same city
    PROFESSIONS.filter(p => p.slug !== profSlug).slice(0, 3).forEach(p => {
      links.push(`/s/${p.slug}-${citySlug}`);
    });
  }

  if (pageType === "problem_city") {
    links.push(`/problemes-maison`);
    PROBLEMS.slice(0, 3).forEach(p => {
      links.push(`/s/${p.slug}-${citySlug}`);
    });
  }

  return [...new Set(links)].slice(0, 6);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "generate";

    // ─── GENERATE ───────────────────────────────────────────
    if (action === "generate") {
      const batchSize = body.batchSize || 5;
      const { data: queue } = await supabase
        .from("seo_generation_queue")
        .select("*")
        .eq("status", "pending")
        .order("created_at")
        .limit(batchSize);

      if (!queue?.length) {
        return json({ generated: 0, message: "Queue empty" });
      }

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
                          properties: {
                            question: { type: "string" },
                            answer: { type: "string" },
                          },
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

          // Check for duplicate slug
          const { data: existing } = await supabase
            .from("seo_pages")
            .select("id")
            .eq("slug", finalSlug)
            .maybeSingle();

          if (existing) {
            // Update existing page
            await supabase.from("seo_pages").update({
              title: pageData.title,
              meta_description: pageData.meta_description,
              h1: pageData.h1 || pageData.title,
              body_md: pageData.body_md,
              city: city,
              profession: item.profession || pageData.recommended_profession || null,
              specialty: item.specialty || null,
              intent: item.intent || null,
              faq_json: faqItems,
              schema_json: schemaJson,
              internal_links: internalLinks,
              content_data: pageData,
              updated_at: new Date().toISOString(),
            }).eq("id", existing.id);

            await supabase.from("seo_generation_queue").update({
              status: "completed",
              result_page_id: existing.id,
              processed_at: new Date().toISOString(),
            }).eq("id", item.id);
          } else {
            const { data: page, error: pageError } = await supabase.from("seo_pages").insert({
              title: pageData.title,
              slug: finalSlug,
              page_type: pageType,
              meta_description: pageData.meta_description,
              h1: pageData.h1 || pageData.title,
              body_md: pageData.body_md,
              city: city,
              profession: item.profession || pageData.recommended_profession || null,
              specialty: item.specialty || null,
              intent: item.intent || null,
              faq_json: faqItems,
              schema_json: schemaJson,
              internal_links: internalLinks,
              content_data: pageData,
              is_published: false,
              status: "draft",
            }).select("id").single();

            if (pageError) {
              await supabase.from("seo_generation_queue").update({ status: "error", error_message: pageError.message }).eq("id", item.id);
              errors.push(`${item.id}: ${pageError.message}`);
              continue;
            }

            await supabase.from("seo_generation_queue").update({
              status: "completed",
              result_page_id: page.id,
              processed_at: new Date().toISOString(),
            }).eq("id", item.id);
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
          city: i.city,
          problem: i.problem || null,
          profession: i.profession || null,
          specialty: i.specialty || null,
          intent: i.intent || null,
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

      // Get existing slugs to avoid duplicates
      const { data: existingPages } = await supabase
        .from("seo_pages")
        .select("slug");
      const existingSlugs = new Set((existingPages || []).map((p: any) => p.slug));

      const { data: existingQueue } = await supabase
        .from("seo_generation_queue")
        .select("city, profession, problem, status")
        .in("status", ["pending", "processing"]);
      const pendingKeys = new Set((existingQueue || []).map((q: any) =>
        `${slugify(q.profession || q.problem || "")}-${slugify(q.city || "")}`
      ));

      for (const city of targetCities) {
        const citySlug = slugify(city);

        if (targetTypes.includes("profession_city")) {
          for (const prof of PROFESSIONS) {
            const slug = `${prof.slug}-${citySlug}`;
            if (!existingSlugs.has(slug) && !pendingKeys.has(slug)) {
              items.push({
                city,
                profession: prof.label,
                specialty: prof.specialty,
                page_type: "profession_city",
                status: "pending",
              });
            }
          }
        }

        if (targetTypes.includes("problem_city")) {
          for (const problem of PROBLEMS) {
            const slug = `${problem.slug}-${citySlug}`;
            if (!existingSlugs.has(slug) && !pendingKeys.has(slug)) {
              items.push({
                city,
                problem: problem.label,
                page_type: "problem_city",
                status: "pending",
              });
            }
          }
        }
      }

      if (items.length === 0) return json({ seeded: 0, message: "All combinations already exist" });

      // Insert in batches of 100
      let seeded = 0;
      for (let i = 0; i < items.length; i += 100) {
        const batch = items.slice(i, i + 100);
        const { data } = await supabase.from("seo_generation_queue").insert(batch).select("id");
        seeded += data?.length || 0;
      }

      return json({
        seeded,
        cities: targetCities.length,
        professions: targetTypes.includes("profession_city") ? PROFESSIONS.length : 0,
        problems: targetTypes.includes("problem_city") ? PROBLEMS.length : 0,
        potentialPages: items.length,
      });
    }

    // ─── PUBLISH ────────────────────────────────────────────
    if (action === "publish") {
      const pageIds = body.pageIds || [];
      const publishAll = body.publishAll || false;

      if (publishAll) {
        const { count } = await supabase
          .from("seo_pages")
          .update({ is_published: true, status: "published", published_at: new Date().toISOString() })
          .eq("is_published", false)
          .not("body_md", "is", null);
        return json({ published: count || 0 });
      }

      if (pageIds.length > 0) {
        const { count } = await supabase
          .from("seo_pages")
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

      // Get city and type breakdown
      const { data: cityBreakdown } = await supabase
        .from("seo_pages")
        .select("city")
        .not("city", "is", null);
      const cities = [...new Set((cityBreakdown || []).map((p: any) => p.city))];

      const { data: typeBreakdown } = await supabase
        .from("seo_pages")
        .select("page_type");
      const typeCounts: Record<string, number> = {};
      (typeBreakdown || []).forEach((p: any) => {
        typeCounts[p.page_type] = (typeCounts[p.page_type] || 0) + 1;
      });

      return json({
        queue: {
          pending: queuePending.count || 0,
          processing: queueProcessing.count || 0,
          error: queueError.count || 0,
        },
        pages: {
          total: totalPages.count || 0,
          published: publishedPages.count || 0,
          draft: draftPages.count || 0,
        },
        cities: cities.length,
        cityList: cities,
        typeBreakdown: typeCounts,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("seo-generator error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
