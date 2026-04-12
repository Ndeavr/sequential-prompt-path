import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AIPPFactorDef {
  key: string;
  label: string;
  weight: number;
  check: (e: any, c: any) => number;
}

const FACTORS: AIPPFactorDef[] = [
  // Visibility (max ~20)
  { key: "google_rating", label: "Note Google", weight: 2, check: (e, c) => c.google_rating >= 4 ? 5 : c.google_rating >= 3 ? 3 : 0 },
  { key: "review_count", label: "Nombre d'avis", weight: 2, check: (e) => e.estimated_review_count >= 20 ? 5 : e.estimated_review_count >= 5 ? 3 : 0 },
  { key: "website_live", label: "Site web actif", weight: 1.5, check: (e) => e.website_title ? 5 : 0 },
  { key: "https", label: "HTTPS activé", weight: 1, check: (e) => e.has_https ? 5 : 0 },

  // Structure (max ~15)
  { key: "service_pages", label: "Pages services", weight: 2, check: (e) => e.has_service_pages ? 5 : 0 },
  { key: "city_pages", label: "Pages villes", weight: 1.5, check: (e) => e.has_city_pages ? 5 : 0 },
  { key: "schema", label: "Données structurées", weight: 1.5, check: (e) => e.has_schema ? 5 : 0 },
  { key: "faq", label: "FAQ présente", weight: 1, check: (e) => e.has_faq ? 5 : 0 },

  // Trust (max ~15)
  { key: "reviews_widget", label: "Widget avis", weight: 2, check: (e) => e.has_reviews_widget ? 5 : 0 },
  { key: "phone_visible", label: "Téléphone visible", weight: 1.5, check: (e) => e.has_phone_visible ? 5 : 0 },
  { key: "email_visible", label: "Email visible", weight: 1, check: (e) => e.has_email_visible ? 5 : 0 },

  // Conversion (max ~15)
  { key: "booking_cta", label: "CTA réservation", weight: 2.5, check: (e) => e.has_booking_cta ? 5 : 0 },
  { key: "financing", label: "Financement visible", weight: 1, check: (e) => e.has_financing_visible ? 5 : 0 },

  // Content (max ~10)
  { key: "meta_desc", label: "Meta description", weight: 1.5, check: (e) => e.website_meta_description ? 5 : 0 },
  { key: "gallery", label: "Portfolio / Galerie", weight: 1.5, check: (e) => e.has_before_after_gallery ? 5 : 0 },

  // Local Presence (max ~10)
  { key: "local_city_match", label: "Ville détectée", weight: 2, check: (e) => e.has_city_pages ? 5 : 0 },

  // AI Readiness (max ~15)
  { key: "ai_schema", label: "Schema.org pour IA", weight: 2, check: (e) => e.has_schema ? 5 : 0 },
  { key: "ai_faq", label: "FAQ structurée IA", weight: 1.5, check: (e) => e.has_faq ? 5 : 0 },
  { key: "ai_services_clear", label: "Services clairs", weight: 1.5, check: (e) => e.has_service_pages ? 5 : 0 },
];

function getLevel(score: number): string {
  if (score >= 80) return "dominant";
  if (score >= 60) return "fort";
  if (score >= 40) return "moyen";
  return "faible";
}

function getHeadline(score: number, companyName: string): string {
  if (score >= 80) return `${companyName} a un excellent positionnement IA`;
  if (score >= 60) return `${companyName} est bien positionné mais peut progresser`;
  if (score >= 40) return `${companyName} a une base, mais reste sous-optimisé pour l'IA`;
  return `${companyName} est peu lisible par les moteurs IA`;
}

function getSummary(score: number): string {
  if (score >= 80) return "Votre entreprise est bien structurée et lisible pour l'IA. Quelques optimisations mineures peuvent consolider votre avance.";
  if (score >= 60) return "Bonne base de visibilité. Des ajustements ciblés sur la structure et la conversion peuvent significativement améliorer votre positionnement.";
  if (score >= 40) return "Votre entreprise est présente mais mal comprise par l'IA. Des corrections rapides peuvent générer des résultats visibles.";
  return "Votre présence web manque de signaux critiques. L'IA a du mal à comprendre, recommander et faire confiance à votre entreprise.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get enrichment data
    const [{ data: enrichment }, { data: company }] = await Promise.all([
      supabase.from("prospect_enrichments").select("*").eq("prospect_id", company_id).maybeSingle(),
      supabase.from("outbound_companies").select("*").eq("id", company_id).maybeSingle(),
    ]);

    if (!enrichment) {
      return new Response(JSON.stringify({ error: "Enrichment data not found. Run enrichment first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compute factors
    const factors: Array<{ key: string; label: string; value: number; weight: number; status: string; note: string }> = [];
    const categoryScores: Record<string, { total: number; max: number }> = {
      visibility: { total: 0, max: 0 },
      structure: { total: 0, max: 0 },
      trust: { total: 0, max: 0 },
      conversion: { total: 0, max: 0 },
      content: { total: 0, max: 0 },
      local_presence: { total: 0, max: 0 },
      ai_readiness: { total: 0, max: 0 },
    };

    const categoryMap: Record<string, string> = {
      google_rating: "visibility", review_count: "visibility", website_live: "visibility", https: "visibility",
      service_pages: "structure", city_pages: "structure", schema: "structure", faq: "structure",
      reviews_widget: "trust", phone_visible: "trust", email_visible: "trust",
      booking_cta: "conversion", financing: "conversion",
      meta_desc: "content", gallery: "content",
      local_city_match: "local_presence",
      ai_schema: "ai_readiness", ai_faq: "ai_readiness", ai_services_clear: "ai_readiness",
    };

    for (const f of FACTORS) {
      const value = f.check(enrichment, company || {});
      const weighted = value * f.weight;
      const maxWeighted = 5 * f.weight;
      const cat = categoryMap[f.key] || "visibility";
      categoryScores[cat].total += weighted;
      categoryScores[cat].max += maxWeighted;

      factors.push({
        key: f.key,
        label: f.label,
        value,
        weight: f.weight,
        status: value >= 4 ? "strong" : value >= 2 ? "moderate" : "weak",
        note: value >= 4 ? "Bon signal" : value >= 2 ? "À améliorer" : "Absent ou faible",
      });
    }

    // Normalize each category to 0-100
    const normalize = (cat: string) => {
      const c = categoryScores[cat];
      return c.max > 0 ? Math.round((c.total / c.max) * 100) : 0;
    };

    const visibility_score = normalize("visibility");
    const structure_score = normalize("structure");
    const trust_score = normalize("trust");
    const conversion_score = normalize("conversion");
    const content_score = normalize("content");
    const local_presence_score = normalize("local_presence");
    const ai_readiness_score = normalize("ai_readiness");

    const score_global = Math.round(
      visibility_score * 0.2 + structure_score * 0.15 + trust_score * 0.15 +
      conversion_score * 0.2 + content_score * 0.1 + local_presence_score * 0.1 +
      ai_readiness_score * 0.1
    );

    const weakFactors = factors.filter(f => f.status === "weak").sort((a, b) => b.weight - a.weight);
    const top_issues = weakFactors.slice(0, 3).map(f => ({ key: f.key, label: f.label, note: f.note }));
    const quick_wins = weakFactors.slice(0, 3).map(f => {
      const wins: Record<string, string> = {
        booking_cta: "Ajouter un bouton de réservation visible sur votre site",
        schema: "Ajouter les données structurées Schema.org",
        faq: "Créer une section FAQ sur vos services",
        service_pages: "Créer des pages dédiées par service",
        city_pages: "Créer des pages par ville desservie",
        reviews_widget: "Afficher vos avis Google sur votre site",
        meta_desc: "Optimiser vos meta descriptions",
        gallery: "Ajouter un portfolio avant/après",
        phone_visible: "Rendre votre numéro de téléphone plus visible",
      };
      return { key: f.key, label: wins[f.key] || `Améliorer : ${f.label}` };
    });

    const companyName = company?.company_name || "Votre entreprise";
    const score_level = getLevel(score_global);

    // Upsert score
    const scoreData = {
      prospect_id: company_id,
      score_global,
      visibility_score,
      structure_score,
      trust_score,
      conversion_score,
      content_score,
      local_presence_score,
      ai_readiness_score,
      score_level,
      summary_headline: getHeadline(score_global, companyName),
      summary_short: getSummary(score_global),
      top_issues,
      quick_wins,
      generated_at: new Date().toISOString(),
    };

    const { data: existingScore } = await supabase
      .from("prospect_aipp_scores")
      .select("id")
      .eq("prospect_id", company_id)
      .maybeSingle();

    if (existingScore) {
      await supabase.from("prospect_aipp_scores").update(scoreData).eq("id", existingScore.id);
    } else {
      await supabase.from("prospect_aipp_scores").insert(scoreData);
    }

    // Upsert factors
    await supabase.from("prospect_aipp_factors").delete().eq("prospect_id", company_id);
    await supabase.from("prospect_aipp_factors").insert(
      factors.map(f => ({
        prospect_id: company_id,
        factor_key: f.key,
        factor_label: f.label,
        factor_value: f.value,
        factor_weight: f.weight,
        factor_status: f.status,
        factor_note: f.note,
      }))
    );

    // Update lead status
    const { data: leads } = await supabase
      .from("outbound_leads")
      .select("id, crm_status")
      .eq("company_id", company_id);

    for (const lead of (leads || [])) {
      if (["new", "imported", "enriched"].includes(lead.crm_status)) {
        await supabase.from("outbound_leads").update({ crm_status: "scored" }).eq("id", lead.id);
      }
    }

    return new Response(JSON.stringify({ success: true, score: scoreData, factors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
