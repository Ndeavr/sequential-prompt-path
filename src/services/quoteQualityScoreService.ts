/**
 * UNPRO — Quote Quality Score Engine
 * Evaluates document clarity, professionalism, and completeness.
 * Never fabricates data. Scores only what is actually present.
 */

import type { DocumentExtractionResult, ExtractedField } from "@/types/documentExtraction";
import type {
  QuoteQualityResult,
  QuoteQualityCategoryScore,
  QuoteQualityTier,
} from "@/types/quoteQuality";

/* ─── Helpers ─── */

/** Check if a field was found (not "not_found" and has a non-empty value) */
function isPresent(f: ExtractedField | undefined | null): boolean {
  if (!f) return false;
  return f.confidence !== "not_found" && !!f.value?.trim();
}

function scoreField(f: ExtractedField | undefined | null, weight: number): number {
  if (!f) return 0;
  if (f.confidence === "not_found" || !f.value?.trim()) return 0;
  if (f.confidence === "high") return weight;
  if (f.confidence === "medium") return Math.round(weight * 0.7);
  return Math.round(weight * 0.4); // low
}

/* ─── Category Scorers ─── */

function scoreBusinessIdentity(ext: DocumentExtractionResult): QuoteQualityCategoryScore {
  const MAX = 20;
  const fields = [
    { f: ext.business_name, w: 5, label: "Nom de l'entreprise" },
    { f: ext.phone, w: 4, label: "Téléphone" },
    { f: ext.address, w: 4, label: "Adresse" },
    { f: ext.rbq_number, w: 4, label: "Numéro RBQ" },
    { f: ext.website, w: 3, label: "Site web" },
  ];

  let score = 0;
  const present: string[] = [];
  const missing: string[] = [];

  for (const { f, w, label } of fields) {
    const s = scoreField(f, w);
    score += s;
    if (isPresent(f)) present.push(label);
    else missing.push(label);
  }

  return { key: "business_identity", label: "Identité de l'entreprise", score: Math.min(score, MAX), max: MAX, present, missing };
}

function scoreScopeClarity(ext: DocumentExtractionResult): QuoteQualityCategoryScore {
  const MAX = 20;
  const present: string[] = [];
  const missing: string[] = [];
  let score = 0;

  // Scope of work is the main field — worth up to 12
  const scopeScore = scoreField(ext.scope_of_work, 12);
  score += scopeScore;
  if (isPresent(ext.scope_of_work)) {
    present.push("Description des travaux");
    // Bonus: check length for detail level
    const len = ext.scope_of_work.value?.length ?? 0;
    if (len > 200) score += 4; // detailed
    else if (len > 80) score += 2;
  } else {
    missing.push("Description des travaux");
  }

  // Exclusions
  if (isPresent(ext.exclusions)) {
    score += 4;
    present.push("Exclusions mentionnées");
  } else {
    missing.push("Exclusions");
  }

  return { key: "scope_clarity", label: "Clarté de la portée", score: Math.min(score, MAX), max: MAX, present, missing };
}

function scorePriceTransparency(ext: DocumentExtractionResult): QuoteQualityCategoryScore {
  const MAX = 20;
  const fields = [
    { f: ext.total_price, w: 7, label: "Montant total" },
    { f: ext.taxes, w: 5, label: "Taxes (TPS/TVQ)" },
    { f: ext.payment_terms, w: 8, label: "Conditions de paiement" },
  ];

  let score = 0;
  const present: string[] = [];
  const missing: string[] = [];

  for (const { f, w, label } of fields) {
    const s = scoreField(f, w);
    score += s;
    if (isPresent(f)) present.push(label);
    else missing.push(label);
  }

  return { key: "price_transparency", label: "Transparence du prix", score: Math.min(score, MAX), max: MAX, present, missing };
}

function scoreProfessionalStructure(ext: DocumentExtractionResult): QuoteQualityCategoryScore {
  const MAX = 15;
  const present: string[] = [];
  const missing: string[] = [];
  let score = 0;

  // Date
  if (isPresent(ext.date)) { score += 4; present.push("Date du document"); }
  else missing.push("Date du document");

  // Signature blocks
  if (isPresent(ext.signature_blocks)) { score += 4; present.push("Section signature"); }
  else missing.push("Section signature");

  // Legal name (indicates formality)
  if (isPresent(ext.legal_name)) { score += 3; present.push("Raison sociale"); }
  else missing.push("Raison sociale");

  // Email (professional contact)
  if (isPresent(ext.email)) { score += 2; present.push("Courriel professionnel"); }
  else missing.push("Courriel professionnel");

  // NEQ (extra formality signal)
  if (isPresent(ext.neq)) { score += 2; present.push("Numéro NEQ"); }
  else missing.push("Numéro NEQ");

  return { key: "professional_structure", label: "Structure professionnelle", score: Math.min(score, MAX), max: MAX, present, missing };
}

function scoreWarrantyProtections(ext: DocumentExtractionResult): QuoteQualityCategoryScore {
  const MAX = 15;
  const present: string[] = [];
  const missing: string[] = [];
  let score = 0;

  // Warranties
  if (isPresent(ext.warranties)) {
    const wLen = ext.warranties.value?.length ?? 0;
    if (wLen > 50) { score += 8; present.push("Garanties détaillées"); }
    else { score += 5; present.push("Garanties mentionnées"); }
  } else {
    missing.push("Garanties");
  }

  // Insurance via scope or payment terms mentions
  // Since there's no dedicated insurance field, check scope for mentions
  const allText = [
    ext.scope_of_work?.value,
    ext.warranties?.value,
    ext.payment_terms?.value,
  ].filter(Boolean).join(" ").toLowerCase();

  if (allText.includes("assurance") || allText.includes("insurance")) {
    score += 4; present.push("Référence à l'assurance");
  } else {
    missing.push("Référence à l'assurance");
  }

  // Timeline
  if (allText.includes("délai") || allText.includes("échéancier") || allText.includes("semaine") || allText.includes("jour")) {
    score += 3; present.push("Échéancier mentionné");
  } else {
    missing.push("Échéancier des travaux");
  }

  return { key: "warranty_protections", label: "Garanties et protections", score: Math.min(score, MAX), max: MAX, present, missing };
}

function scoreContractReadiness(ext: DocumentExtractionResult): QuoteQualityCategoryScore {
  const MAX = 10;
  const present: string[] = [];
  const missing: string[] = [];
  let score = 0;

  // Document type signal
  const docType = ext.document_type;
  if (docType === "contract" || docType === "work_agreement") {
    score += 4; present.push("Document de type contrat");
  } else if (docType === "quote" || docType === "estimate" || docType === "proposal") {
    score += 2; present.push("Soumission structurée");
  } else {
    missing.push("Type de document clair");
  }

  // Document clarity
  if (ext.document_clarity === "clear") {
    score += 3; present.push("Document lisible et clair");
  } else if (ext.document_clarity === "partial") {
    score += 1; present.push("Document partiellement lisible");
  } else {
    missing.push("Clarté du document");
  }

  // Client info
  if (isPresent(ext.client_name)) { score += 1.5; present.push("Nom du client"); }
  else missing.push("Nom du client");

  if (isPresent(ext.project_address)) { score += 1.5; present.push("Adresse du projet"); }
  else missing.push("Adresse du projet");

  return { key: "contract_readiness", label: "Prêt pour un contrat", score: Math.min(Math.round(score), MAX), max: MAX, present, missing };
}

/* ─── Tier ─── */
function getTier(score: number): { tier: QuoteQualityTier; label: string } {
  if (score >= 80) return { tier: "bien_structure", label: "Soumission bien structurée" };
  if (score >= 60) return { tier: "correct", label: "Soumission correcte" };
  if (score >= 40) return { tier: "partiel", label: "Informations partielles" };
  return { tier: "faible", label: "Faible clarté" };
}

/* ─── Strengths / Missing / Red Flags / Questions ─── */

function deriveStrengths(cats: QuoteQualityCategoryScore[]): string[] {
  const strengths: string[] = [];
  for (const c of cats) {
    const pct = c.score / c.max;
    if (pct >= 0.7 && c.present.length > 0) {
      strengths.push(`${c.label} : ${c.present.join(", ")}`);
    }
  }
  return strengths;
}

function deriveMissing(cats: QuoteQualityCategoryScore[]): string[] {
  const all: string[] = [];
  for (const c of cats) {
    for (const m of c.missing) {
      all.push(m);
    }
  }
  return all;
}

function deriveRedFlags(ext: DocumentExtractionResult, cats: QuoteQualityCategoryScore[]): string[] {
  const flags: string[] = [];

  // No RBQ on a document that looks like a quote
  const isQuoteType = ["quote", "estimate", "proposal", "contract", "work_agreement"].includes(ext.document_type);
  if (isQuoteType && !isPresent(ext.rbq_number)) {
    flags.push("Le numéro de licence RBQ n'apparaît pas dans ce document.");
  }

  // Price without taxes
  if (isPresent(ext.total_price) && !isPresent(ext.taxes)) {
    flags.push("Un montant total est indiqué mais les taxes ne sont pas détaillées séparément.");
  }

  // No scope on a quote
  if (isQuoteType && !isPresent(ext.scope_of_work)) {
    flags.push("La portée des travaux n'est pas décrite dans le document.");
  }

  // Very low professional structure
  const structCat = cats.find(c => c.key === "professional_structure");
  if (structCat && structCat.score / structCat.max < 0.3) {
    flags.push("Le document manque de structure professionnelle (date, signature, raison sociale).");
  }

  return flags;
}

function deriveQuestions(ext: DocumentExtractionResult, cats: QuoteQualityCategoryScore[]): string[] {
  const questions: string[] = [];

  if (!isPresent(ext.rbq_number)) {
    questions.push("Quel est votre numéro de licence RBQ ?");
  }
  if (!isPresent(ext.warranties)) {
    questions.push("Offrez-vous une garantie sur les travaux et les matériaux ?");
  }
  if (!isPresent(ext.payment_terms)) {
    questions.push("Quelles sont les conditions et le calendrier de paiement ?");
  }
  if (!isPresent(ext.exclusions)) {
    questions.push("Y a-t-il des travaux ou des éléments exclus de cette soumission ?");
  }

  const allText = [ext.scope_of_work?.value, ext.warranties?.value, ext.payment_terms?.value].filter(Boolean).join(" ").toLowerCase();
  if (!allText.includes("assurance")) {
    questions.push("Avez-vous une assurance responsabilité civile en vigueur ?");
  }
  if (!allText.includes("délai") && !allText.includes("échéancier") && !allText.includes("semaine")) {
    questions.push("Quel est l'échéancier prévu pour les travaux ?");
  }

  return questions;
}

/* ─── Main ─── */

/**
 * Compute the Quote Quality Score from a document extraction.
 * Pure function — no side effects, no API calls.
 */
export function computeQuoteQualityScore(extraction: DocumentExtractionResult): QuoteQualityResult {
  const categories: QuoteQualityCategoryScore[] = [
    scoreBusinessIdentity(extraction),
    scoreScopeClarity(extraction),
    scorePriceTransparency(extraction),
    scoreProfessionalStructure(extraction),
    scoreWarrantyProtections(extraction),
    scoreContractReadiness(extraction),
  ];

  const total_score = categories.reduce((sum, c) => sum + c.score, 0);
  const { tier, label: tier_label } = getTier(total_score);

  return {
    total_score,
    tier,
    tier_label,
    categories,
    strengths: deriveStrengths(categories),
    missing_info: deriveMissing(categories),
    red_flags: deriveRedFlags(extraction, categories),
    questions_to_ask: deriveQuestions(extraction, categories),
  };
}
