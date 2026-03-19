/**
 * UNPRO — Seed SEO Pages Edge Function
 * Generates programmatic SEO page records in seo_pages table.
 * POST /seed-seo-pages { cities?: string[], professions?: string[], problems?: string[], mode?: "dry_run" | "create" }
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CITIES = [
  "montreal", "laval", "longueuil", "quebec", "gatineau", "sherbrooke",
  "trois-rivieres", "levis", "terrebonne", "saint-jean-sur-richelieu",
  "brossard", "repentigny", "drummondville", "granby", "saint-hyacinthe",
];

const CITY_LABELS: Record<string, string> = {
  "montreal": "Montréal", "laval": "Laval", "longueuil": "Longueuil",
  "quebec": "Québec", "gatineau": "Gatineau", "sherbrooke": "Sherbrooke",
  "trois-rivieres": "Trois-Rivières", "levis": "Lévis",
  "terrebonne": "Terrebonne", "saint-jean-sur-richelieu": "Saint-Jean-sur-Richelieu",
  "brossard": "Brossard", "repentigny": "Repentigny",
  "drummondville": "Drummondville", "granby": "Granby",
  "saint-hyacinthe": "Saint-Hyacinthe",
};

const PROFESSIONS = [
  { slug: "couvreur", label: "Couvreur" },
  { slug: "plombier", label: "Plombier" },
  { slug: "electricien", label: "Électricien" },
  { slug: "entrepreneur-general", label: "Entrepreneur général" },
  { slug: "peintre", label: "Peintre" },
  { slug: "menuisier", label: "Menuisier" },
  { slug: "maconnerie", label: "Maçon" },
  { slug: "isolation", label: "Expert en isolation" },
  { slug: "courtier-immobilier", label: "Courtier immobilier" },
];

const PROBLEMS = [
  { slug: "infiltration-eau", label: "Infiltration d'eau" },
  { slug: "toiture-usee", label: "Toiture usée" },
  { slug: "fissure-fondation", label: "Fissure de fondation" },
  { slug: "moisissure", label: "Moisissure" },
  { slug: "perte-chaleur", label: "Perte de chaleur" },
  { slug: "condensation-fenetre", label: "Condensation aux fenêtres" },
  { slug: "drain-francais", label: "Drain français défaillant" },
  { slug: "panneau-electrique-ancien", label: "Panneau électrique ancien" },
  { slug: "plancher-endommage", label: "Plancher endommagé" },
  { slug: "humidite-sous-sol", label: "Humidité au sous-sol" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "create";
    const filterCities = body.cities || CITIES;
    const filterProfessions = body.professions || PROFESSIONS.map((p) => p.slug);
    const filterProblems = body.problems || PROBLEMS.map((p) => p.slug);

    const pages: any[] = [];

    // Profession × City
    for (const prof of PROFESSIONS) {
      if (!filterProfessions.includes(prof.slug)) continue;
      for (const city of filterCities) {
        const cityLabel = CITY_LABELS[city] || city;
        pages.push({
          slug: `${prof.slug}-${city}`,
          page_type: "profession_city",
          title: `${prof.label} à ${cityLabel} — Vérifié UNPRO`,
          h1: `Trouver un ${prof.label.toLowerCase()} vérifié à ${cityLabel}`,
          meta_description: `Comparez les meilleurs ${prof.label.toLowerCase()}s à ${cityLabel}. Profils vérifiés, score AIPP, avis authentiques.`,
          body_md: `## ${prof.label} à ${cityLabel}\n\nTrouvez un ${prof.label.toLowerCase()} vérifié à ${cityLabel} sur UNPRO.`,
          faq_json: [
            { question: `Comment trouver un ${prof.label.toLowerCase()} à ${cityLabel}?`, answer: `Utilisez UNPRO pour comparer des professionnels vérifiés à ${cityLabel}.` },
          ],
          schema_json: { "@context": "https://schema.org", "@type": "Service", name: `${prof.label} à ${cityLabel}` },
          intent: "find_professional",
          profession: prof.slug,
          city,
          status: "published",
          is_published: true,
          internal_links: [`/profession/${prof.slug}`, `/ville/${city}`, `/services`],
        });
      }
    }

    // Problem × City
    for (const prob of PROBLEMS) {
      if (!filterProblems.includes(prob.slug)) continue;
      for (const city of filterCities) {
        const cityLabel = CITY_LABELS[city] || city;
        pages.push({
          slug: `${prob.slug}-${city}`,
          page_type: "problem_city",
          title: `${prob.label} à ${cityLabel} — Solutions | UNPRO`,
          h1: `${prob.label} à ${cityLabel} : causes et solutions`,
          meta_description: `${prob.label} à ${cityLabel}? Découvrez les causes, solutions et professionnels vérifiés.`,
          body_md: `## ${prob.label} à ${cityLabel}\n\nDécouvrez les causes et solutions pour ${prob.label.toLowerCase()} à ${cityLabel}.`,
          faq_json: [
            { question: `Que faire en cas de ${prob.label.toLowerCase()} à ${cityLabel}?`, answer: `Contactez un professionnel vérifié UNPRO pour un diagnostic rapide.` },
          ],
          schema_json: { "@context": "https://schema.org", "@type": "FAQPage" },
          intent: "solve_problem",
          specialty: prob.slug,
          city,
          status: "published",
          is_published: true,
          internal_links: [`/probleme/${prob.slug}`, `/ville/${city}`, `/services`],
        });
      }
    }

    if (mode === "dry_run") {
      return new Response(JSON.stringify({ ok: true, mode: "dry_run", count: pages.length, sample: pages.slice(0, 3) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert in batches of 50
    let created = 0;
    let errors = 0;
    for (let i = 0; i < pages.length; i += 50) {
      const batch = pages.slice(i, i + 50);
      const { error } = await supabase.from("seo_pages").upsert(batch, { onConflict: "slug" });
      if (error) {
        errors += batch.length;
        console.error("Batch error:", error.message);
      } else {
        created += batch.length;
      }
    }

    return new Response(JSON.stringify({ ok: true, created, errors, total: pages.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
