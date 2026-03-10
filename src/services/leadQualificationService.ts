/**
 * UNPRO — Lead Qualification Scoring Service
 * Deterministic scoring (0–100) with explainable factors.
 * ISOLATED: replaceable by ML/AI pipeline later.
 */

interface LeadInput {
  notes?: string | null;
  project_category?: string | null;
  property_linked: boolean;
  preferred_date?: string | null;
  budget_range?: string | null;
  timeline?: string | null;
  urgency_level?: string | null;
  has_quotes: boolean;
  has_documents: boolean;
  homeowner_profile_completeness: number; // 0–100
}

interface ScoreFactor {
  label: string;
  points: number;
  reason: string;
}

interface LeadScoreResult {
  score: number;
  level: "high" | "medium" | "low";
  factors: ScoreFactor[];
  strengths: string[];
  missing: string[];
}

export function computeLeadScore(input: LeadInput): LeadScoreResult {
  const factors: ScoreFactor[] = [];
  let total = 0;

  // --- Project clarity ---
  const descLen = (input.notes ?? "").trim().length;
  if (descLen > 100) {
    factors.push({ label: "Description détaillée", points: 15, reason: `${descLen} caractères — bonne clarté du projet.` });
    total += 15;
  } else if (descLen > 30) {
    factors.push({ label: "Description présente", points: 8, reason: "Description courte mais présente." });
    total += 8;
  } else {
    factors.push({ label: "Description absente", points: 0, reason: "Pas de description ou très courte." });
  }

  if (input.project_category) {
    factors.push({ label: "Catégorie spécifiée", points: 8, reason: `Catégorie : ${input.project_category}` });
    total += 8;
  } else {
    factors.push({ label: "Catégorie manquante", points: 0, reason: "Aucune catégorie de projet spécifiée." });
  }

  if (input.property_linked) {
    factors.push({ label: "Propriété liée", points: 10, reason: "Une propriété est associée à la demande." });
    total += 10;
  } else {
    factors.push({ label: "Pas de propriété", points: 0, reason: "Aucune propriété associée." });
  }

  // --- Intent signals ---
  if (input.has_quotes) {
    factors.push({ label: "Soumission téléversée", points: 12, reason: "Le propriétaire a déjà une soumission — forte intention." });
    total += 12;
  }

  if (input.budget_range) {
    factors.push({ label: "Budget indiqué", points: 10, reason: `Budget : ${input.budget_range}` });
    total += 10;
  } else {
    factors.push({ label: "Budget non précisé", points: 0, reason: "Aucun budget indiqué." });
  }

  if (input.timeline) {
    factors.push({ label: "Échéancier précisé", points: 8, reason: `Échéancier : ${input.timeline}` });
    total += 8;
  } else {
    factors.push({ label: "Échéancier non précisé", points: 0, reason: "Aucun échéancier indiqué." });
  }

  // --- Trust signals ---
  if (input.homeowner_profile_completeness >= 80) {
    factors.push({ label: "Profil complet", points: 10, reason: `Complétude du profil : ${input.homeowner_profile_completeness}%` });
    total += 10;
  } else if (input.homeowner_profile_completeness >= 50) {
    factors.push({ label: "Profil partiel", points: 5, reason: `Complétude du profil : ${input.homeowner_profile_completeness}%` });
    total += 5;
  } else {
    factors.push({ label: "Profil incomplet", points: 0, reason: "Le profil du propriétaire est peu rempli." });
  }

  if (input.has_documents) {
    factors.push({ label: "Documents joints", points: 7, reason: "Des documents ont été téléversés." });
    total += 7;
  }

  // --- Urgency ---
  if (input.urgency_level === "urgent") {
    factors.push({ label: "Urgence élevée", points: 12, reason: "Le propriétaire a indiqué une urgence." });
    total += 12;
  } else if (input.urgency_level === "soon") {
    factors.push({ label: "Bientôt nécessaire", points: 6, reason: "Projet prévu à court terme." });
    total += 6;
  }

  if (input.preferred_date) {
    const daysUntil = Math.ceil((new Date(input.preferred_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 7 && daysUntil >= 0) {
      factors.push({ label: "Date imminente", points: 8, reason: `Rendez-vous dans ${daysUntil} jour(s).` });
      total += 8;
    } else if (daysUntil <= 14 && daysUntil > 7) {
      factors.push({ label: "Date proche", points: 4, reason: `Rendez-vous dans ${daysUntil} jours.` });
      total += 4;
    }
  }

  const score = Math.max(0, Math.min(100, total));
  const level: "high" | "medium" | "low" = score >= 60 ? "high" : score >= 35 ? "medium" : "low";

  const strengths = factors.filter((f) => f.points > 0).map((f) => f.label);
  const missing = factors.filter((f) => f.points === 0).map((f) => f.label);

  return { score, level, factors, strengths, missing };
}

export function getDescriptionLengthScore(notes?: string | null): number {
  const len = (notes ?? "").trim().length;
  if (len > 200) return 100;
  if (len > 100) return 75;
  if (len > 30) return 40;
  return 10;
}

export function getProfileCompleteness(profile: { full_name?: string | null; email?: string | null; phone?: string | null; avatar_url?: string | null } | null): number {
  if (!profile) return 0;
  let score = 0;
  if (profile.full_name) score += 35;
  if (profile.email) score += 25;
  if (profile.phone) score += 25;
  if (profile.avatar_url) score += 15;
  return score;
}
