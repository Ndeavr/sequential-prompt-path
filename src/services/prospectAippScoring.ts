/**
 * UNPRO — Prospect AIPP Scoring Engine
 * Scores contractor prospects for acquisition outreach.
 * Deterministic, explainable, commercially motivating.
 */

export interface ProspectSiteData {
  title?: string | null;
  meta_description?: string | null;
  h1?: string | null;
  h2_count?: number;
  word_count?: number;
  has_schema?: boolean;
  has_local_pages?: boolean;
  has_blog?: boolean;
  has_cta?: boolean;
  has_financing?: boolean;
  has_reviews_section?: boolean;
  has_before_after?: boolean;
  mobile_friendly?: boolean;
  page_speed_estimate?: number;
}

export interface ProspectReviewData {
  review_count?: number;
  rating?: number;
  review_velocity_90d?: number;
  google_present?: boolean;
  facebook_present?: boolean;
}

export interface ProspectScoringInput {
  website?: string | null;
  site?: ProspectSiteData | null;
  reviews?: ProspectReviewData | null;
  category?: string | null;
  city?: string | null;
  is_running_ads?: boolean;
  paid_intent_confidence?: number;
}

export interface ProspectDiagnosticItem {
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface ProspectQuickWin {
  title: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface ProspectScoreResult {
  aipp_score: number;
  seo_score: number;
  reviews_score: number;
  content_score: number;
  ai_score: number;
  branding_score: number;
  trust_score: number;
  local_score: number;
  conversion_score: number;
  score_confidence: number;
  diagnostic_summary: string;
  diagnostic: ProspectDiagnosticItem[];
  quick_wins: ProspectQuickWin[];
  competitor_gap: string[];
  estimated_monthly_loss_min: number;
  estimated_monthly_loss_max: number;
}

const CATEGORY_VALUE: Record<string, { min: number; max: number }> = {
  toiture: { min: 3000, max: 12000 },
  isolation: { min: 2000, max: 8000 },
  pavage: { min: 2500, max: 10000 },
  plomberie: { min: 1500, max: 6000 },
  électricité: { min: 1200, max: 5000 },
  rénovation: { min: 3000, max: 15000 },
  fondation: { min: 3000, max: 12000 },
  fenêtres: { min: 2000, max: 8000 },
  paysagement: { min: 1000, max: 5000 },
  gouttières: { min: 800, max: 3000 },
  maçonnerie: { min: 2000, max: 8000 },
  béton: { min: 2000, max: 8000 },
  peinture: { min: 1000, max: 4000 },
  ventilation: { min: 1500, max: 5000 },
  portes_garage: { min: 1500, max: 5000 },
  revêtement: { min: 2000, max: 8000 },
};

export function generateProspectAippScore(input: ProspectScoringInput): ProspectScoreResult {
  const diag: ProspectDiagnosticItem[] = [];
  const wins: ProspectQuickWin[] = [];
  const gaps: string[] = [];
  const s = input.site;
  const r = input.reviews;

  // --- SEO (15 pts) ---
  let seo = 0;
  if (s) {
    if (s.title && s.title.length > 10) seo += 3;
    else diag.push({ severity: 'warning', message: 'Titre de page absent ou trop court.' });
    if (s.meta_description && s.meta_description.length > 50) seo += 2;
    if (s.h1) seo += 2;
    if (s.has_local_pages) { seo += 4; } else {
      diag.push({ severity: 'critical', message: 'Aucune page locale par ville ou service détectée.' });
      wins.push({ title: 'Créer des pages locales', impact: 'high', description: 'Ajouter 5+ pages ciblées par service et ville pour capter la demande locale.' });
    }
    if (s.has_blog) seo += 2;
    if ((s.word_count ?? 0) > 500) seo += 2; else seo += 1;
  } else if (input.website) {
    seo = 3; // has website but no data yet
  } else {
    seo = 0;
    diag.push({ severity: 'critical', message: 'Aucun site web détecté. Visibilité numérique quasi nulle.' });
  }
  seo = Math.min(15, seo);

  // --- Reviews (10 pts) ---
  let reviews = 0;
  if (r) {
    const rc = r.review_count ?? 0;
    const rating = r.rating ?? 0;
    if (rc >= 50 && rating >= 4.5) { reviews = 10; }
    else if (rc >= 20 && rating >= 4.0) { reviews = 7; }
    else if (rc >= 10) { reviews = 5; }
    else if (rc >= 3) { reviews = 3; }
    else { reviews = 1; diag.push({ severity: 'warning', message: 'Très peu d\'avis clients visibles en ligne.' }); }
    if ((r.review_velocity_90d ?? 0) === 0 && rc > 0) {
      diag.push({ severity: 'info', message: 'Aucun nouvel avis dans les 90 derniers jours.' });
    }
  } else {
    reviews = 2;
  }

  // --- Content (10 pts) ---
  let content = 0;
  if (s) {
    if ((s.word_count ?? 0) > 1000) content += 3; else if ((s.word_count ?? 0) > 300) content += 1;
    if (s.has_before_after) content += 2;
    if (s.has_reviews_section) content += 2;
    if ((s.h2_count ?? 0) >= 3) content += 2;
    if (s.has_blog) content += 1;
  } else {
    content = 1;
    diag.push({ severity: 'warning', message: 'Contenu web insuffisant pour établir la crédibilité.' });
  }
  content = Math.min(10, content);

  // --- AI readiness (15 pts) ---
  let ai = 0;
  if (s) {
    if (s.has_schema) ai += 4; else {
      diag.push({ severity: 'critical', message: 'Aucune donnée structurée (schema) détectée. Les moteurs IA ne peuvent pas vous indexer correctement.' });
      wins.push({ title: 'Ajouter des données structurées', impact: 'high', description: 'Implémenter JSON-LD LocalBusiness et FAQ pour être recommandé par les IA.' });
    }
    if (s.h1 && s.title) ai += 2;
    if ((s.h2_count ?? 0) >= 3) ai += 2;
    if (s.has_local_pages) ai += 3;
    if ((s.word_count ?? 0) > 500) ai += 2;
    if (s.has_cta) ai += 2;
  } else {
    ai = 0;
    gaps.push('Votre présence est invisible pour les moteurs IA et les assistants de recommandation.');
  }
  ai = Math.min(15, ai);

  // --- Branding/UX (10 pts) ---
  let branding = 0;
  if (s) {
    if (s.mobile_friendly) branding += 3; else diag.push({ severity: 'warning', message: 'Site non optimisé pour mobile.' });
    if ((s.page_speed_estimate ?? 50) >= 70) branding += 3; else branding += 1;
    if (s.has_before_after) branding += 2;
    if ((s.word_count ?? 0) > 200) branding += 2;
  } else {
    branding = 1;
  }
  branding = Math.min(10, branding);

  // --- Trust (10 pts) ---
  let trust = 0;
  if (s) {
    if (s.has_financing) trust += 2;
    if (s.has_reviews_section) trust += 3;
    if (s.has_cta) trust += 2;
    if (s.has_before_after) trust += 1;
    trust += 2; // base for having a site
  } else {
    trust = 0;
    diag.push({ severity: 'critical', message: 'Aucun signal de confiance visible pour les clients potentiels.' });
  }
  trust = Math.min(10, trust);

  // --- Local (15 pts) ---
  let local = 0;
  if (s?.has_local_pages) local += 6;
  else {
    wins.push({ title: 'Pages locales ciblées', impact: 'high', description: 'Créer des pages par ville/quartier pour dominer localement.' });
    gaps.push('Les leaders locaux capturent plus de trafic grâce à des pages par service + ville.');
  }
  if (r?.google_present) local += 4;
  if (input.city) local += 2;
  if (s?.has_cta) local += 1;
  if (input.is_running_ads) local += 2;
  local = Math.min(15, local);

  // --- Conversion (15 pts) ---
  let conversion = 0;
  if (s) {
    if (s.has_cta) conversion += 4; else {
      diag.push({ severity: 'critical', message: 'Aucun appel à l\'action clair détecté sur le site.' });
      wins.push({ title: 'Ajouter des CTA visibles', impact: 'high', description: 'Ajouter des boutons d\'action sur chaque page pour convertir les visiteurs.' });
    }
    if (s.has_financing) conversion += 2;
    if (s.has_reviews_section) conversion += 2;
    if (s.has_before_after) conversion += 2;
    if (s.mobile_friendly) conversion += 2;
    if ((s.word_count ?? 0) > 500) conversion += 1;
    conversion += 2; // base
  } else {
    conversion = 0;
    gaps.push('Votre site explique peut-être vos services, mais ne convertit pas efficacement.');
  }
  conversion = Math.min(15, conversion);

  const aipp = Math.min(100, seo + reviews + content + ai + branding + trust + local + conversion);

  // Confidence
  let confidence = 30;
  if (s) confidence += 30;
  if (r && (r.review_count ?? 0) > 0) confidence += 20;
  if (input.website) confidence += 10;
  if (input.is_running_ads) confidence += 10;
  confidence = Math.min(100, confidence);

  // Revenue leak
  const catKey = (input.category ?? '').toLowerCase().replace(/[^a-zéèêë]/g, '');
  const catVal = Object.entries(CATEGORY_VALUE).find(([k]) => catKey.includes(k))?.[1] ?? { min: 1500, max: 6000 };
  const lossMultiplier = Math.max(0.1, (100 - aipp) / 100);
  const lossMin = Math.round(catVal.min * lossMultiplier);
  const lossMax = Math.round(catVal.max * lossMultiplier);

  // Summary
  let summary: string;
  if (aipp < 40) summary = 'Votre présence numérique est fragile. Vous laissez probablement passer une part importante de la demande locale.';
  else if (aipp < 55) summary = 'Votre site existe, mais il ne capte pas la demande locale avec assez de profondeur pour dominer votre marché.';
  else if (aipp < 70) summary = 'Bon potentiel, mais sous-optimisé. Vos concurrents structurés peuvent vous dépasser dans les recherches à haute intention.';
  else if (aipp < 85) summary = 'Profil solide, encore perfectible. Quelques optimisations clés pourraient augmenter significativement votre conversion.';
  else summary = 'Présence dominante. Vous êtes bien positionné, mais la compétition évolue constamment.';

  // Default gap messages
  if (gaps.length === 0) {
    gaps.push('Les meilleurs joueurs montrent plus de preuve, plus vite.');
    gaps.push('Votre marque paraît correcte, mais pas dominante sur votre territoire.');
  }

  // Default quick wins if empty
  if (wins.length === 0) {
    wins.push({ title: 'Renforcer vos CTA mobiles', impact: 'medium', description: 'Optimiser l\'expérience mobile pour capter plus de demandes.' });
    wins.push({ title: 'Ajouter une section FAQ', impact: 'medium', description: 'Les FAQ aident le SEO et répondent aux questions fréquentes.' });
  }

  return {
    aipp_score: aipp,
    seo_score: seo,
    reviews_score: reviews,
    content_score: content,
    ai_score: ai,
    branding_score: branding,
    trust_score: trust,
    local_score: local,
    conversion_score: conversion,
    score_confidence: confidence,
    diagnostic_summary: summary,
    diagnostic: diag,
    quick_wins: wins,
    competitor_gap: gaps,
    estimated_monthly_loss_min: lossMin,
    estimated_monthly_loss_max: lossMax,
  };
}
