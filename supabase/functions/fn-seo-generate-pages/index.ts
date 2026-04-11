/**
 * UNPRO — SEO Mass Page Generator
 * Generates seo_pages entries for all city × service and city × problem combinations.
 * POST /fn-seo-generate-pages { mode: "profession_city" | "problem_city" | "all", dry_run?: boolean }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Content variation templates for semantic uniqueness
const PROFESSION_INTROS = [
  (prof: string, city: string) => `Vous cherchez un ${prof} fiable à ${city}? UNPRO vous connecte avec des professionnels vérifiés, disponibles maintenant.`,
  (prof: string, city: string) => `Trouvez le meilleur ${prof} à ${city}. Entrepreneurs vérifiés, rendez-vous garanti, zéro spam.`,
  (prof: string, city: string) => `Besoin d'un ${prof} à ${city}? UNPRO remplace les soumissions multiples par un rendez-vous garanti avec le bon pro.`,
];

const PROBLEM_INTROS = [
  (prob: string, city: string) => `Vous avez un problème de ${prob} à ${city}? UNPRO identifie la cause et vous connecte au bon spécialiste.`,
  (prob: string, city: string) => `${prob} à ${city} : causes, solutions et coûts estimés. Trouvez le bon professionnel en 30 secondes.`,
  (prob: string, city: string) => `Ne laissez pas un problème de ${prob} s'aggraver. À ${city}, UNPRO vous trouve le spécialiste qu'il vous faut.`,
];

const PROFESSION_BODIES: ((prof: string, city: string) => string)[] = [
  (prof, city) => `## Pourquoi choisir un ${prof} vérifié à ${city}?

Un ${prof} qualifié à ${city} fait toute la différence. Chez UNPRO, chaque professionnel est vérifié : licence RBQ, assurances, avis clients et score AIPP.

### Ce que vous obtenez avec UNPRO

- **Rendez-vous garanti** — pas de soumissions multiples
- **Professionnel vérifié** — licence, assurances, références
- **Prix transparent** — estimation avant même le rendez-vous
- **Disponibilité réelle** — on vérifie avant de vous matcher

### Comment ça fonctionne?

1. Décrivez votre projet en quelques mots
2. Notre IA analyse et trouve le meilleur match
3. Vous recevez un rendez-vous garanti

### Prix estimatif à ${city}

Les tarifs d'un ${prof} à ${city} varient selon l'ampleur du projet. Contactez-nous pour une estimation personnalisée basée sur votre situation exacte.

### Zone desservie

Nos ${prof}s couvrent ${city} et les environs. Vérification de disponibilité instantanée.`,
];

const PROBLEM_BODIES: ((prob: string, city: string) => string)[] = [
  (prob, city) => `## ${prob} à ${city} : comprendre et agir

Un problème de ${prob} peut rapidement s'aggraver si non traité. À ${city}, les conditions climatiques québécoises amplifient souvent ce type de situation.

### Symptômes courants

- Signes visibles de détérioration
- Impact sur le confort ou la sécurité
- Risque d'aggravation si non traité

### Solutions recommandées

Le traitement d'un problème de ${prob} nécessite l'intervention d'un professionnel qualifié. UNPRO identifie le bon spécialiste selon votre situation exacte.

### Estimation des coûts à ${city}

Les coûts varient selon la gravité et l'étendue du problème. Notre système fournit une estimation personnalisée avant même le rendez-vous.

### Pourquoi agir maintenant?

- Éviter l'aggravation et les coûts supplémentaires
- Préserver la valeur de votre propriété
- Profiter des disponibilités actuelles des professionnels

### Trouver un spécialiste à ${city}

UNPRO vous connecte avec des professionnels vérifiés spécialisés en ${prob} à ${city}. Rendez-vous garanti, pas de spam.`,
];

function generateFaq(type: string, name: string, city: string): { question: string; answer: string }[] {
  if (type === "profession_city") {
    return [
      { question: `Combien coûte un ${name} à ${city}?`, answer: `Les tarifs varient selon le projet. UNPRO fournit une estimation personnalisée avant le rendez-vous.` },
      { question: `Comment trouver un bon ${name} à ${city}?`, answer: `UNPRO vérifie chaque professionnel : licence RBQ, assurances, avis clients et score de confiance AIPP.` },
      { question: `Est-ce que le rendez-vous est garanti?`, answer: `Oui. UNPRO garantit le rendez-vous avec un professionnel vérifié et disponible.` },
      { question: `Quels sont les délais pour un ${name} à ${city}?`, answer: `Les délais dépendent de la saison et de la demande. Notre système vérifie la disponibilité en temps réel.` },
      { question: `UNPRO remplace les soumissions?`, answer: `Oui. Au lieu de 3 soumissions, vous recevez 1 rendez-vous garanti avec le bon professionnel.` },
    ];
  }
  return [
    { question: `Comment régler un problème de ${name} à ${city}?`, answer: `La première étape est un diagnostic par un professionnel qualifié. UNPRO vous connecte au bon spécialiste.` },
    { question: `Combien coûte la réparation de ${name}?`, answer: `Les coûts varient selon la gravité. UNPRO fournit une estimation personnalisée.` },
    { question: `Est-ce urgent de traiter ${name}?`, answer: `Dans la plupart des cas, oui. Un traitement rapide évite l'aggravation et des coûts plus élevés.` },
    { question: `Qui contacter pour ${name} à ${city}?`, answer: `UNPRO vous met en contact avec des spécialistes vérifiés dans votre secteur.` },
    { question: `Les assurances couvrent-elles ${name}?`, answer: `Certaines assurances couvrent ce type de problème. Consultez votre police ou demandez à votre professionnel.` },
  ];
}

function generateJsonLd(type: string, name: string, city: string, slug: string, faq: any[]) {
  const schemas: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: type === "profession_city" ? `${name} à ${city}` : `Réparation ${name} à ${city}`,
      provider: {
        "@type": "Organization",
        name: "UNPRO",
        url: "https://unpro.ca",
      },
      areaServed: {
        "@type": "City",
        name: city,
        addressRegion: "QC",
        addressCountry: "CA",
      },
      url: `https://unpro.ca/s/${slug}`,
    },
  ];

  if (faq.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f: any) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  return schemas;
}

function generateInternalLinks(type: string, citySlug: string, profSlug: string, allCities: string[], allProfs: string[]): string[] {
  const links: string[] = [];
  // Link to same service in nearby cities (max 3)
  const otherCities = allCities.filter(c => c !== citySlug).slice(0, 3);
  for (const c of otherCities) {
    links.push(`/s/${profSlug}-${c}`);
  }
  // Link to other services in same city (max 3)
  const otherProfs = allProfs.filter(p => p !== profSlug).slice(0, 3);
  for (const p of otherProfs) {
    links.push(`/s/${p}-${citySlug}`);
  }
  return links;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mode = "all", dry_run = false } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Fetch cities
    const { data: cities } = await sb.from("cities").select("name, slug").eq("is_active", true);
    if (!cities?.length) throw new Error("No active cities");

    const citySlugs = cities.map(c => c.slug);
    const pages: any[] = [];
    const startTime = Date.now();

    // Generate profession × city pages
    if (mode === "profession_city" || mode === "all") {
      const { data: activities } = await sb.from("activities_primary").select("name").eq("status", "active");
      if (activities?.length) {
        const profSlugs = activities.map(a => slugify(a.name));
        for (const activity of activities) {
          const profSlug = slugify(activity.name);
          for (const city of cities) {
            const slug = `${profSlug}-${city.slug}`;
            const introIdx = Math.abs(slug.charCodeAt(0)) % PROFESSION_INTROS.length;
            const intro = PROFESSION_INTROS[introIdx](activity.name, city.name);
            const body = PROFESSION_BODIES[0](activity.name, city.name);
            const faq = generateFaq("profession_city", activity.name, city.name);
            const jsonLd = generateJsonLd("profession_city", activity.name, city.name, slug, faq);
            const internalLinks = generateInternalLinks("profession_city", city.slug, profSlug, citySlugs, profSlugs);

            pages.push({
              slug,
              page_type: "profession_city",
              title: `${activity.name} à ${city.name} — Rendez-vous garanti | UNPRO`,
              h1: `${activity.name} à ${city.name}`,
              meta_description: intro.slice(0, 155),
              body_md: `${intro}\n\n${body}`,
              faq_json: faq,
              schema_json: jsonLd,
              internal_links: internalLinks,
              profession: activity.name,
              city: city.name,
              is_published: true,
              status: "published",
              generation_version: "v1",
              quality_score: 70,
            });
          }
        }
      }
    }

    // Generate problem × city pages
    if (mode === "problem_city" || mode === "all") {
      const { data: problems } = await sb.from("home_problems").select("name_fr, slug").eq("is_active", true);
      if (problems?.length) {
        const probSlugs = problems.map(p => p.slug);
        for (const problem of problems) {
          for (const city of cities) {
            const slug = `${problem.slug}-${city.slug}`;
            const introIdx = Math.abs(slug.charCodeAt(0)) % PROBLEM_INTROS.length;
            const intro = PROBLEM_INTROS[introIdx](problem.name_fr, city.name);
            const body = PROBLEM_BODIES[0](problem.name_fr, city.name);
            const faq = generateFaq("problem_city", problem.name_fr, city.name);
            const jsonLd = generateJsonLd("problem_city", problem.name_fr, city.name, slug, faq);
            const internalLinks = generateInternalLinks("problem_city", city.slug, problem.slug, citySlugs, probSlugs);

            pages.push({
              slug,
              page_type: "problem_city",
              title: `${problem.name_fr} à ${city.name} — Solutions et spécialistes | UNPRO`,
              h1: `${problem.name_fr} à ${city.name}`,
              meta_description: intro.slice(0, 155),
              body_md: `${intro}\n\n${body}`,
              faq_json: faq,
              schema_json: jsonLd,
              internal_links: internalLinks,
              city: city.name,
              is_published: true,
              status: "published",
              generation_version: "v1",
              quality_score: 65,
            });
          }
        }
      }
    }

    if (dry_run) {
      return new Response(JSON.stringify({
        dry_run: true,
        pages_to_generate: pages.length,
        sample: pages.slice(0, 3).map(p => ({ slug: p.slug, title: p.title })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upsert pages in batches
    let created = 0;
    let updated = 0;
    let errors = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < pages.length; i += BATCH_SIZE) {
      const batch = pages.slice(i, i + BATCH_SIZE);
      const { data, error } = await sb
        .from("seo_pages")
        .upsert(batch, { onConflict: "slug", ignoreDuplicates: false })
        .select("id");

      if (error) {
        console.error("Batch error:", error.message);
        errors += batch.length;
      } else {
        created += data?.length || 0;
      }
    }

    // Log generation
    const genTime = Date.now() - startTime;
    await sb.from("seo_generation_logs").insert({
      generation_type: "mass_generation",
      agent_version: "v1",
      quality_score: 70,
      generation_time_ms: genTime,
      metadata: { mode, total: pages.length, created, updated, errors },
    });

    return new Response(JSON.stringify({
      success: true,
      mode,
      total_generated: pages.length,
      created,
      errors,
      generation_time_ms: genTime,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("Generation error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
