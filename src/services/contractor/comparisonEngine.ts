/**
 * UNPRO — Contractor Comparison Engine
 * Generates structured, neutral comparisons between 2–5 contractors.
 * Never says "A is better than B" — explains differences instead.
 */

import { getTrustBand, type TrustBand } from "@/lib/trustLabels";

// ─── Types ───

export interface ComparisonContractor {
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
  // Scores
  unpro_score?: number;
  aipp_score?: number;
  // Quote quality (optional)
  quote_quality_score?: number;
  quote_quality_tier?: string;
  // Service match
  service_match?: "exact" | "partial" | "unknown";
  // Missing proofs
  missing_proofs?: string[];
}

export type ComparisonRowKey =
  | "verified"
  | "identity_certainty"
  | "trust_score"
  | "quote_quality"
  | "service_match"
  | "location"
  | "public_presence"
  | "documentation"
  | "missing_proofs"
  | "recommendation";

export interface ComparisonCellValue {
  display: string;
  variant: "positive" | "neutral" | "caution" | "missing";
  detail?: string;
}

export interface ComparisonRow {
  key: ComparisonRowKey;
  label: string;
  icon: string;
  cells: Record<string, ComparisonCellValue>; // keyed by contractor id
}

export interface ComparisonInsight {
  contractor_id: string;
  text_fr: string;
  tone: "positive" | "neutral" | "caution";
}

export interface ComparisonResult {
  rows: ComparisonRow[];
  insights: ComparisonInsight[];
  summary_fr: string;
}

// ─── Helpers ───

function identityCertainty(c: ComparisonContractor): ComparisonCellValue {
  if (c.admin_verified) return { display: "Élevée", variant: "positive", detail: "Profil revu par l'équipe UnPRO" };
  if (c.verification_status === "verified" && (c.unpro_score ?? 0) >= 60)
    return { display: "Bonne", variant: "positive", detail: "Informations cohérentes détectées" };
  if (c.verification_status === "verified")
    return { display: "Modérée", variant: "neutral", detail: "Vérification partielle effectuée" };
  return { display: "Limitée", variant: "caution", detail: "Peu d'informations vérifiées" };
}

function trustScoreCell(c: ComparisonContractor): ComparisonCellValue {
  const band = getTrustBand(c.unpro_score ?? null);
  if (!band) return { display: "Non évalué", variant: "missing" };
  const variantMap: Record<TrustBand, ComparisonCellValue["variant"]> = {
    solide: "positive", encourageant: "neutral", prudence: "caution", incomplete: "missing",
  };
  return { display: band.label_fr, variant: variantMap[band.band] };
}

function quoteQualityCell(c: ComparisonContractor): ComparisonCellValue {
  if (c.quote_quality_score == null) return { display: "Non soumise", variant: "missing" };
  const s = c.quote_quality_score;
  if (s >= 80) return { display: `${s}/100`, variant: "positive", detail: "Soumission bien structurée" };
  if (s >= 60) return { display: `${s}/100`, variant: "neutral", detail: "Soumission correcte" };
  if (s >= 40) return { display: `${s}/100`, variant: "caution", detail: "Informations partielles" };
  return { display: `${s}/100`, variant: "caution", detail: "Faible clarté" };
}

function serviceMatchCell(c: ComparisonContractor): ComparisonCellValue {
  switch (c.service_match) {
    case "exact": return { display: "Correspondance exacte", variant: "positive" };
    case "partial": return { display: "Correspondance partielle", variant: "neutral" };
    default: return { display: "Non confirmé", variant: "missing" };
  }
}

function locationCell(c: ComparisonContractor, targetCity?: string): ComparisonCellValue {
  const city = c.city ?? "Inconnue";
  if (targetCity && city.toLowerCase() === targetCity.toLowerCase())
    return { display: city, variant: "positive", detail: "Même ville que le projet" };
  return { display: city, variant: "neutral" };
}

function publicPresenceCell(c: ComparisonContractor): ComparisonCellValue {
  const signals: string[] = [];
  if (c.website) signals.push("Site web");
  if ((c.review_count ?? 0) > 0) signals.push(`${c.review_count} avis`);
  if ((c.rating ?? 0) >= 4) signals.push(`${c.rating}★`);
  if (signals.length >= 2) return { display: signals.join(" · "), variant: "positive" };
  if (signals.length === 1) return { display: signals[0], variant: "neutral" };
  return { display: "Présence limitée", variant: "caution" };
}

function missingProofsCell(c: ComparisonContractor): ComparisonCellValue {
  const missing = c.missing_proofs ?? [];
  if (missing.length === 0) return { display: "Aucune lacune détectée", variant: "positive" };
  if (missing.length <= 2) return { display: missing.join(", "), variant: "neutral" };
  return { display: `${missing.length} éléments manquants`, variant: "caution", detail: missing.join(", ") };
}

// ─── Insight Generator ───

function generateInsights(contractors: ComparisonContractor[]): ComparisonInsight[] {
  const insights: ComparisonInsight[] = [];

  for (const c of contractors) {
    // Verified profile
    if (c.admin_verified) {
      insights.push({ contractor_id: c.id, text_fr: `${c.business_name} possède un profil validé par l'équipe UnPRO.`, tone: "positive" });
    }
    // Strong quote
    if ((c.quote_quality_score ?? 0) >= 75) {
      insights.push({ contractor_id: c.id, text_fr: `${c.business_name} présente une soumission détaillée et bien structurée.`, tone: "positive" });
    }
    // Weak quote
    if (c.quote_quality_score != null && c.quote_quality_score < 40) {
      insights.push({ contractor_id: c.id, text_fr: `La soumission de ${c.business_name} manque de certaines informations importantes.`, tone: "caution" });
    }
    // Missing proofs
    if ((c.missing_proofs?.length ?? 0) >= 3) {
      insights.push({ contractor_id: c.id, text_fr: `Plusieurs informations restent à confirmer pour ${c.business_name}.`, tone: "caution" });
    }
    // Strong reviews
    if ((c.review_count ?? 0) >= 10 && (c.rating ?? 0) >= 4.5) {
      insights.push({ contractor_id: c.id, text_fr: `${c.business_name} bénéficie de nombreux avis positifs.`, tone: "positive" });
    }
    // Experience
    if ((c.years_experience ?? 0) >= 15) {
      insights.push({ contractor_id: c.id, text_fr: `${c.business_name} possède plus de 15 ans d'expérience.`, tone: "positive" });
    }
  }

  return insights;
}

// ─── Main Engine ───

export function compareContractors(
  contractors: ComparisonContractor[],
  options?: { targetCity?: string }
): ComparisonResult {
  const ids = contractors.map((c) => c.id);

  const buildCells = (fn: (c: ComparisonContractor) => ComparisonCellValue) =>
    Object.fromEntries(contractors.map((c) => [c.id, fn(c)]));

  const rows: ComparisonRow[] = [
    {
      key: "verified",
      label: "Validé par UnPRO",
      icon: "shield-check",
      cells: buildCells((c) =>
        c.admin_verified
          ? { display: "Oui", variant: "positive" }
          : { display: "Non", variant: "neutral" }
      ),
    },
    {
      key: "identity_certainty",
      label: "Certitude identitaire",
      icon: "fingerprint",
      cells: buildCells(identityCertainty),
    },
    {
      key: "trust_score",
      label: "Confiance UnPRO",
      icon: "shield",
      cells: buildCells(trustScoreCell),
    },
    {
      key: "quote_quality",
      label: "Qualité de la soumission",
      icon: "file-text",
      cells: buildCells(quoteQualityCell),
    },
    {
      key: "service_match",
      label: "Correspondance de service",
      icon: "check-circle",
      cells: buildCells(serviceMatchCell),
    },
    {
      key: "location",
      label: "Proximité géographique",
      icon: "map-pin",
      cells: buildCells((c) => locationCell(c, options?.targetCity)),
    },
    {
      key: "public_presence",
      label: "Présence publique",
      icon: "globe",
      cells: buildCells(publicPresenceCell),
    },
    {
      key: "documentation",
      label: "Clarté documentaire",
      icon: "file-check",
      cells: buildCells((c) => {
        if (c.quote_quality_score == null) return { display: "Aucun document", variant: "missing" };
        if (c.quote_quality_score >= 70) return { display: "Bonne", variant: "positive" };
        if (c.quote_quality_score >= 45) return { display: "Partielle", variant: "neutral" };
        return { display: "Insuffisante", variant: "caution" };
      }),
    },
    {
      key: "missing_proofs",
      label: "Informations manquantes",
      icon: "alert-circle",
      cells: buildCells(missingProofsCell),
    },
    {
      key: "recommendation",
      label: "Observation UnPRO",
      icon: "message-circle",
      cells: buildCells((c) => {
        if (c.admin_verified && (c.quote_quality_score ?? 0) >= 70)
          return { display: "Profil vérifié avec documentation claire", variant: "positive" };
        if (c.admin_verified)
          return { display: "Profil vérifié — soumission non analysée", variant: "neutral" };
        if ((c.unpro_score ?? 0) >= 70)
          return { display: "Bonnes cohérences détectées", variant: "positive" };
        if ((c.unpro_score ?? 0) >= 40)
          return { display: "Certaines vérifications en cours", variant: "neutral" };
        return { display: "Informations limitées disponibles", variant: "caution" };
      }),
    },
  ];

  const insights = generateInsights(contractors);

  const summary_fr =
    contractors.length === 2
      ? `Comparaison de ${contractors[0].business_name} et ${contractors[1].business_name}. Consultez chaque ligne pour comprendre les différences.`
      : `Comparaison de ${contractors.length} entrepreneurs. Les observations ci-dessous mettent en lumière les différences sans établir de classement.`;

  return { rows, insights, summary_fr };
}
