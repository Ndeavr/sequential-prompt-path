/**
 * UNPRO — Homeowner Decision Assistant Engine
 * "Quel entrepreneur contacter en premier ?"
 *
 * Ranks contractors by weighted signals and generates plain-language explanations.
 * Never implies certainty beyond available data.
 */

import { getTrustBand } from "@/lib/trustLabels";

// ─── Types ───

export interface DecisionContractor {
  id: string;
  business_name: string;
  city?: string;
  province?: string;
  logo_url?: string;
  rating?: number;
  review_count?: number;
  verification_status?: string;
  admin_verified?: boolean;
  years_experience?: number;
  specialty?: string;
  website?: string;
  unpro_score?: number;
  aipp_score?: number;
  quote_quality_score?: number;
  service_match?: "exact" | "partial" | "unknown";
  ccai_score?: number;
  dna_fit_score?: number;
  budget_fit_score?: number;
  missing_proofs?: string[];
}

export interface DecisionSuggestion {
  contractor: DecisionContractor;
  priority_rank: number;
  priority_score: number;
  explanation_fr: string;
  strengths_fr: string[];
  cautions_fr: string[];
  suggested_action: "contact" | "book" | "upload_quote" | "ask_alex";
  action_label_fr: string;
}

export interface DecisionResult {
  suggestions: DecisionSuggestion[];
  summary_fr: string;
}

// ─── Signal weights ───

const WEIGHTS = {
  service_relevance: 25,
  verified_status: 20,
  trust_signals: 18,
  quote_quality: 15,
  geographic_relevance: 12,
  missing_risk: 10,
};

// ─── Scoring ───

function scoreServiceRelevance(c: DecisionContractor): number {
  if (c.service_match === "exact") return 100;
  if (c.service_match === "partial") return 55;
  return 20;
}

function scoreVerifiedStatus(c: DecisionContractor): number {
  if (c.admin_verified) return 100;
  if (c.verification_status === "verified") return 65;
  if (c.verification_status === "pending") return 30;
  return 10;
}

function scoreTrust(c: DecisionContractor): number {
  const unpro = c.unpro_score ?? 0;
  const ccai = c.ccai_score ?? 50;
  const dna = c.dna_fit_score ?? 50;
  // Blend trust score with alignment signals
  return Math.min(100, unpro * 0.5 + ccai * 0.25 + dna * 0.25);
}

function scoreQuoteQuality(c: DecisionContractor): number {
  if (c.quote_quality_score == null) return 30; // No quote → neutral, not penalized harshly
  return c.quote_quality_score;
}

function scoreGeographic(c: DecisionContractor, targetCity?: string): number {
  if (!targetCity || !c.city) return 50;
  if (c.city.toLowerCase() === targetCity.toLowerCase()) return 100;
  return 40;
}

function scoreMissingRisk(c: DecisionContractor): number {
  const missing = c.missing_proofs?.length ?? 0;
  if (missing === 0) return 100;
  if (missing <= 1) return 70;
  if (missing <= 3) return 40;
  return 15;
}

function computePriorityScore(c: DecisionContractor, targetCity?: string): number {
  return (
    scoreServiceRelevance(c) * (WEIGHTS.service_relevance / 100) +
    scoreVerifiedStatus(c) * (WEIGHTS.verified_status / 100) +
    scoreTrust(c) * (WEIGHTS.trust_signals / 100) +
    scoreQuoteQuality(c) * (WEIGHTS.quote_quality / 100) +
    scoreGeographic(c, targetCity) * (WEIGHTS.geographic_relevance / 100) +
    scoreMissingRisk(c) * (WEIGHTS.missing_risk / 100)
  );
}

// ─── Explanation Generator ───

function generateExplanation(c: DecisionContractor, rank: number): { explanation_fr: string; strengths_fr: string[]; cautions_fr: string[] } {
  const strengths: string[] = [];
  const cautions: string[] = [];

  // Strengths
  if (c.admin_verified) {
    strengths.push("Profil validé par l'équipe UnPRO");
  } else if (c.verification_status === "verified") {
    strengths.push("Informations vérifiées et cohérentes");
  }

  if (c.service_match === "exact") {
    strengths.push("Correspondance exacte avec votre type de projet");
  } else if (c.service_match === "partial") {
    strengths.push("Correspondance partielle avec votre projet");
  }

  if ((c.quote_quality_score ?? 0) >= 75) {
    strengths.push("Soumission détaillée et bien structurée");
  }

  if ((c.ccai_score ?? 0) >= 70) {
    strengths.push("Bon alignement de style de travail et communication");
  }

  if ((c.rating ?? 0) >= 4.5 && (c.review_count ?? 0) >= 10) {
    strengths.push(`${c.review_count} avis positifs (${c.rating}★)`);
  }

  if ((c.years_experience ?? 0) >= 10) {
    strengths.push(`${c.years_experience} ans d'expérience`);
  }

  // Cautions
  if ((c.missing_proofs?.length ?? 0) > 0) {
    cautions.push(`${c.missing_proofs!.length} information(s) restent à confirmer`);
  }

  if (c.quote_quality_score != null && c.quote_quality_score < 50) {
    cautions.push("La soumission manque de certaines informations importantes");
  }

  if (!c.admin_verified && c.verification_status !== "verified") {
    cautions.push("Le profil n'a pas encore été vérifié");
  }

  if ((c.ccai_score ?? 50) < 40) {
    cautions.push("Alignement de communication à surveiller");
  }

  // Build main explanation
  let explanation: string;
  if (c.admin_verified && c.service_match === "exact") {
    explanation = `${c.business_name} possède un profil validé par UnPRO et correspond bien à votre type de projet.`;
  } else if (c.admin_verified) {
    explanation = `${c.business_name} possède un profil validé par UnPRO.`;
  } else if ((c.unpro_score ?? 0) >= 70 && c.service_match === "exact") {
    explanation = `${c.business_name} présente de bonnes cohérences et une correspondance exacte avec votre projet.`;
  } else if ((c.unpro_score ?? 0) >= 50) {
    explanation = `${c.business_name} semble cohérent, mais certaines informations restent à confirmer.`;
  } else {
    explanation = `${c.business_name} dispose d'informations limitées. Nous vous recommandons de demander des précisions.`;
  }

  return { explanation_fr: explanation, strengths_fr: strengths, cautions_fr: cautions };
}

function suggestAction(c: DecisionContractor): { action: DecisionSuggestion["suggested_action"]; label: string } {
  if (c.admin_verified && c.service_match === "exact") {
    return { action: "book", label: "Prendre rendez-vous" };
  }
  if (c.quote_quality_score == null && c.service_match !== "unknown") {
    return { action: "upload_quote", label: "Soumettre une soumission" };
  }
  if ((c.unpro_score ?? 0) < 40 || (c.missing_proofs?.length ?? 0) >= 3) {
    return { action: "ask_alex", label: "Demander l'aide d'Alex" };
  }
  return { action: "contact", label: "Contacter cet entrepreneur" };
}

// ─── Main Engine ───

export function generateDecisionSuggestions(
  contractors: DecisionContractor[],
  options?: { targetCity?: string }
): DecisionResult {
  if (contractors.length === 0) {
    return { suggestions: [], summary_fr: "Aucun entrepreneur à évaluer." };
  }

  const scored = contractors
    .map((c) => ({
      contractor: c,
      score: computePriorityScore(c, options?.targetCity),
    }))
    .sort((a, b) => b.score - a.score);

  const suggestions: DecisionSuggestion[] = scored.map(({ contractor, score }, i) => {
    const { explanation_fr, strengths_fr, cautions_fr } = generateExplanation(contractor, i + 1);
    const { action, label } = suggestAction(contractor);
    return {
      contractor,
      priority_rank: i + 1,
      priority_score: Math.round(score),
      explanation_fr,
      strengths_fr,
      cautions_fr,
      suggested_action: action,
      action_label_fr: label,
    };
  });

  const top = suggestions[0]?.contractor.business_name ?? "";
  const summary_fr =
    suggestions.length === 1
      ? `Basé sur les informations disponibles, ${top} est le seul entrepreneur évalué.`
      : `Basé sur ${suggestions.length} entrepreneurs évalués, ${top} présente le profil le plus aligné avec votre projet. Consultez les explications pour chaque suggestion.`;

  return { suggestions, summary_fr };
}
