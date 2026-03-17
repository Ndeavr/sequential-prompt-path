/**
 * UNPRO — Refusal-to-SEO Engine
 * Converts contractor refusal patterns into high-precision SEO page opportunities.
 * 
 * Core loop: refusal signal → pattern detection → page generation → traffic → leads
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────────

export interface RefusalSignal {
  id: string;
  contractor_id: string | null;
  refusal_type: string;
  signal_text: string;
  problem_slug: string | null;
  solution_slug: string | null;
  city_slug: string | null;
  material: string | null;
  structure_type: string | null;
  frequency: number;
  confidence: number;
  seo_opportunity_generated: boolean;
  created_at: string;
}

export interface RefusalSeoPage {
  id: string;
  slug: string;
  page_type: string;
  status: string;
  h1: string;
  meta_title: string;
  meta_description: string;
  problem_explanation: string | null;
  why_contractors_refuse: string | null;
  correct_solution: string | null;
  recommended_professional: string | null;
  materials_detail: string | null;
  structure_context: string | null;
  cost_estimate_min: number | null;
  cost_estimate_max: number | null;
  cost_unit: string | null;
  faq_json: Array<{ question: string; answer: string }>;
  internal_links_json: Array<{ to: string; label: string }>;
  json_ld: Record<string, unknown> | null;
  problem_slug: string | null;
  solution_slug: string | null;
  city_slug: string | null;
  city_name: string | null;
  material: string | null;
  structure_type: string | null;
  profession_slug: string | null;
  source_signal_ids: string[];
  signal_count: number;
  demand_score: number;
  views: number;
  conversions: number;
  published_at: string | null;
  created_at: string;
}

// ─── Slug Generation ────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generatePageSlug(parts: {
  problem?: string;
  solution?: string;
  material?: string;
  structure?: string;
  city?: string;
}): string {
  const segments = [
    parts.solution || parts.problem,
    parts.material,
    parts.structure,
    parts.city,
  ].filter(Boolean);
  return slugify(segments.join(" "));
}

// ─── Page Content Generation ────────────────────────────────────────

export function generateRefusalPageContent(signals: RefusalSignal[]): Partial<RefusalSeoPage> {
  const primary = signals[0];
  if (!primary) return {};

  const cityName = primary.city_slug?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "";
  const problemLabel = primary.problem_slug?.replace(/-/g, " ") || primary.signal_text;
  const solutionLabel = primary.solution_slug?.replace(/-/g, " ") || "";
  const materialLabel = primary.material || "";
  const structureLabel = primary.structure_type || "";

  // Build ultra-precise H1
  const h1Parts = [
    solutionLabel || problemLabel,
    materialLabel,
    structureLabel,
    cityName,
  ].filter(Boolean);
  const h1 = h1Parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" — ");

  const slug = generatePageSlug({
    problem: primary.problem_slug || undefined,
    solution: primary.solution_slug || undefined,
    material: primary.material || undefined,
    structure: primary.structure_type || undefined,
    city: primary.city_slug || undefined,
  });

  const metaTitle = `${h1} | Prix, solutions et experts | UNPRO`;
  const metaDescription = `${h1}. Découvrez pourquoi certains entrepreneurs refusent ce type de travaux, la bonne solution, les coûts estimés et les professionnels qualifiés${cityName ? ` à ${cityName}` : ""}.`;

  // Aggregate refusal reasons
  const refusalReasons = [...new Set(signals.map(s => s.signal_text))];
  const whyRefuse = `Certains entrepreneurs refusent ce type de travaux pour plusieurs raisons : ${refusalReasons.slice(0, 5).join("; ")}. C'est pourquoi il est crucial de trouver un spécialiste qualifié dans ce domaine précis.`;

  // FAQ generation from signal patterns
  const faqs = [
    {
      question: `Pourquoi certains entrepreneurs refusent-ils les travaux de ${problemLabel}${cityName ? ` à ${cityName}` : ""} ?`,
      answer: `Plusieurs raisons expliquent ces refus : ${refusalReasons.slice(0, 3).join(", ")}. Il est recommandé de contacter un spécialiste certifié.`,
    },
    {
      question: `Combien coûte ${solutionLabel || problemLabel}${cityName ? ` à ${cityName}` : ""} ?`,
      answer: `Les coûts varient selon la superficie, les matériaux et la complexité. Obtenez une soumission gratuite via UNPRO pour un prix précis.`,
    },
    {
      question: `Quel professionnel contacter pour ${problemLabel} ?`,
      answer: `Utilisez la vérification UNPRO pour trouver un entrepreneur vérifié, licencié et spécialisé dans ce type de travaux.`,
    },
  ];

  // Internal links
  const internalLinks = [];
  if (primary.problem_slug) {
    internalLinks.push({ to: `/probleme/${primary.problem_slug}`, label: `En savoir plus : ${problemLabel}` });
  }
  if (primary.city_slug) {
    internalLinks.push({ to: `/ville/${primary.city_slug}`, label: `Entrepreneurs à ${cityName}` });
  }
  if (primary.problem_slug && primary.city_slug) {
    internalLinks.push({ to: `/probleme/${primary.problem_slug}/${primary.city_slug}`, label: `${problemLabel} à ${cityName}` });
  }
  internalLinks.push({ to: "/verifier-entrepreneur", label: "Vérifier un entrepreneur" });
  internalLinks.push({ to: "/compare-quotes", label: "Comparer des soumissions" });

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return {
    slug,
    h1,
    meta_title: metaTitle.slice(0, 60),
    meta_description: metaDescription.slice(0, 160),
    problem_explanation: `Les propriétaires${cityName ? ` de ${cityName}` : ""} font face à des défis spécifiques liés à ${problemLabel}. ${structureLabel ? `Les bâtiments de type ${structureLabel} sont particulièrement concernés.` : ""} ${materialLabel ? `L'utilisation de ${materialLabel} est souvent recommandée pour ce type de situation.` : ""}`,
    why_contractors_refuse: whyRefuse,
    correct_solution: solutionLabel
      ? `La solution recommandée est ${solutionLabel}${materialLabel ? ` avec ${materialLabel}` : ""}. Un professionnel qualifié pourra évaluer votre situation et proposer une approche adaptée.`
      : null,
    recommended_professional: null,
    materials_detail: materialLabel || null,
    structure_context: structureLabel || null,
    faq_json: faqs,
    internal_links_json: internalLinks,
    json_ld: jsonLd,
    problem_slug: primary.problem_slug,
    solution_slug: primary.solution_slug,
    city_slug: primary.city_slug,
    city_name: cityName || null,
    material: primary.material,
    structure_type: primary.structure_type,
    source_signal_ids: signals.map(s => s.id),
    signal_count: signals.reduce((sum, s) => sum + s.frequency, 0),
    demand_score: Math.min(100, signals.reduce((sum, s) => sum + s.frequency * s.confidence, 0)),
  };
}

// ─── API Functions ──────────────────────────────────────────────────

export async function fetchRefusalSignals(opts?: { limit?: number; ungeneratedOnly?: boolean }) {
  let query = supabase
    .from("contractor_refusal_signals")
    .select("*")
    .order("frequency", { ascending: false });

  if (opts?.ungeneratedOnly) {
    query = query.eq("seo_opportunity_generated", false);
  }
  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as RefusalSignal[];
}

export async function fetchRefusalSeoPages(opts?: { status?: string; limit?: number }) {
  let query = supabase
    .from("refusal_seo_pages")
    .select("*")
    .order("demand_score", { ascending: false });

  if (opts?.status) {
    query = query.eq("status", opts.status);
  }
  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as RefusalSeoPage[];
}

export async function fetchRefusalSeoPageBySlug(slug: string) {
  const { data, error } = await supabase
    .from("refusal_seo_pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error) return null;
  return data as unknown as RefusalSeoPage;
}

export async function updateRefusalSeoPageStatus(id: string, status: string) {
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "published") update.published_at = new Date().toISOString();

  const { error } = await supabase
    .from("refusal_seo_pages")
    .update(update)
    .eq("id", id);

  if (error) throw error;
}

export async function incrementPageView(id: string) {
  // Simple increment via RPC or direct update
  const { data } = await supabase
    .from("refusal_seo_pages")
    .select("views")
    .eq("id", id)
    .single();

  if (data) {
    await supabase
      .from("refusal_seo_pages")
      .update({ views: (data.views || 0) + 1 })
      .eq("id", id);
  }
}

// ─── Feedback Loop Stats ────────────────────────────────────────────

export async function getRefusalSeoStats() {
  const [signalsRes, pagesRes, publishedRes] = await Promise.all([
    supabase.from("contractor_refusal_signals").select("id", { count: "exact", head: true }),
    supabase.from("refusal_seo_pages").select("id", { count: "exact", head: true }),
    supabase.from("refusal_seo_pages").select("id", { count: "exact", head: true }).eq("status", "published"),
  ]);

  return {
    totalSignals: signalsRes.count || 0,
    totalPages: pagesRes.count || 0,
    publishedPages: publishedRes.count || 0,
  };
}
