/**
 * UNPRO — AIPP Score Service
 * AI-Indexed Professional Profile scoring engine.
 * Deterministic, explainable, no black-box AI.
 */

export interface AIPPInput {
  // Identity & completeness
  business_name?: string | null;
  specialty?: string | null;
  description?: string | null;
  city?: string | null;
  province?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  logo_url?: string | null;
  years_experience?: number | null;
  // Trust
  verification_status?: string | null;
  license_number?: string | null;
  insurance_info?: string | null;
  documents_count?: number;
  review_count?: number | null;
  rating?: number | null;
  // Performance
  accepted_appointments?: number;
  total_appointments?: number;
  // Visibility
  portfolio_urls?: string[] | null;
}

export interface AIPPRecommendation {
  title: string;
  description: string;
  importance: "high" | "medium" | "low";
  estimatedImpact: number; // points
  section: string;
}

export interface AIPPResult {
  score: number;
  grade: string;
  completeness_score: number;
  trust_score: number;
  performance_score: number;
  visibility_score: number;
  strengths: string[];
  weaknesses: string[];
  missing_items: string[];
  recommendations: AIPPRecommendation[];
}

function filled(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  if (typeof v === "number" && v <= 0) return false;
  return true;
}

function descriptionQuality(desc?: string | null): number {
  if (!desc) return 0;
  const len = desc.trim().length;
  if (len >= 200) return 100;
  if (len >= 100) return 70;
  if (len >= 40) return 40;
  return 15;
}

export function computeAIPPScore(input: AIPPInput): AIPPResult {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const missing: string[] = [];
  const recs: AIPPRecommendation[] = [];

  // --- A) Completeness (30 points) ---
  let completeness = 0;
  const completenessMax = 30;

  const identityFields: { key: keyof AIPPInput; label: string; pts: number; recTitle: string }[] = [
    { key: "business_name", label: "Nom d'entreprise", pts: 5, recTitle: "Ajouter le nom d'entreprise" },
    { key: "specialty", label: "Spécialité", pts: 4, recTitle: "Préciser votre spécialité" },
    { key: "description", label: "Description", pts: 5, recTitle: "Rédiger une description complète" },
    { key: "city", label: "Ville", pts: 3, recTitle: "Indiquer votre ville" },
    { key: "phone", label: "Téléphone", pts: 3, recTitle: "Ajouter un numéro de téléphone" },
    { key: "email", label: "Courriel", pts: 2, recTitle: "Ajouter un courriel de contact" },
    { key: "address", label: "Adresse", pts: 2, recTitle: "Ajouter votre adresse" },
    { key: "website", label: "Site web", pts: 2, recTitle: "Ajouter votre site web" },
    { key: "logo_url", label: "Logo", pts: 2, recTitle: "Téléverser votre logo" },
    { key: "years_experience", label: "Années d'expérience", pts: 2, recTitle: "Indiquer vos années d'expérience" },
  ];

  for (const f of identityFields) {
    if (f.key === "description") {
      const q = descriptionQuality(input.description);
      const earned = Math.round((q / 100) * f.pts);
      completeness += earned;
      if (q >= 70) strengths.push("Description détaillée");
      else if (q > 0) {
        weaknesses.push("Description trop courte");
        recs.push({ title: f.recTitle, description: "Une description de 200+ caractères améliore votre visibilité.", importance: "high", estimatedImpact: f.pts - earned, section: "completeness" });
      } else {
        missing.push(f.label);
        recs.push({ title: f.recTitle, description: "Décrivez vos services pour attirer plus de clients.", importance: "high", estimatedImpact: f.pts, section: "completeness" });
      }
    } else if (filled(input[f.key])) {
      completeness += f.pts;
    } else {
      missing.push(f.label);
      recs.push({ title: f.recTitle, description: `Complétez ce champ pour améliorer votre score.`, importance: f.pts >= 4 ? "high" : "medium", estimatedImpact: f.pts, section: "completeness" });
    }
  }

  if (completeness >= completenessMax * 0.8) strengths.push("Profil bien complété");
  else if (completeness < completenessMax * 0.5) weaknesses.push("Profil incomplet");

  // --- B) Trust (35 points) ---
  let trust = 0;
  const trustMax = 35;

  // Verification (10 pts)
  if (input.verification_status === "verified") { trust += 10; strengths.push("Profil vérifié"); }
  else if (input.verification_status === "pending") { trust += 3; }
  else { weaknesses.push("Profil non vérifié"); recs.push({ title: "Faire vérifier votre profil", description: "La vérification augmente la confiance des clients.", importance: "high", estimatedImpact: 10, section: "trust" }); }

  // License (6 pts)
  if (filled(input.license_number)) { trust += 6; strengths.push("Licence renseignée"); }
  else { missing.push("Numéro de licence"); recs.push({ title: "Ajouter votre numéro de licence", description: "Les clients recherchent des entrepreneurs licenciés.", importance: "high", estimatedImpact: 6, section: "trust" }); }

  // Insurance (6 pts)
  if (filled(input.insurance_info)) { trust += 6; strengths.push("Assurance renseignée"); }
  else { missing.push("Information d'assurance"); recs.push({ title: "Ajouter vos informations d'assurance", description: "L'assurance rassure les propriétaires.", importance: "high", estimatedImpact: 6, section: "trust" }); }

  // Documents (4 pts)
  const docCount = input.documents_count ?? 0;
  if (docCount >= 3) { trust += 4; strengths.push("Documents vérifiables téléversés"); }
  else if (docCount >= 1) { trust += 2; }
  else { recs.push({ title: "Téléverser des documents", description: "Ajoutez licence, assurance ou portfolio.", importance: "medium", estimatedImpact: 4, section: "trust" }); }

  // Reviews (6 pts)
  const rc = input.review_count ?? 0;
  if (rc >= 10) { trust += 6; strengths.push(`${rc} avis clients`); }
  else if (rc >= 5) { trust += 4; }
  else if (rc >= 1) { trust += 2; }
  else { recs.push({ title: "Obtenir des avis clients", description: "Les avis améliorent votre classement.", importance: "medium", estimatedImpact: 6, section: "trust" }); }

  // Rating (3 pts)
  const r = input.rating ?? 0;
  if (r >= 4.5) { trust += 3; strengths.push("Excellente note moyenne"); }
  else if (r >= 4) trust += 2;
  else if (r >= 3) trust += 1;

  // --- C) Performance (20 points) ---
  let performance = 0;
  const performanceMax = 20;

  const totalAppts = input.total_appointments ?? 0;
  const acceptedAppts = input.accepted_appointments ?? 0;

  if (totalAppts > 0) {
    const acceptRate = acceptedAppts / totalAppts;
    if (acceptRate >= 0.8) { performance += 12; strengths.push("Excellent taux d'acceptation"); }
    else if (acceptRate >= 0.5) { performance += 7; }
    else { performance += 3; weaknesses.push("Faible taux d'acceptation"); }
  } else {
    // Neutral if no data — give partial credit
    performance += 8;
  }

  // Activity / freshness — give base points (will improve later)
  if (filled(input.business_name)) performance += 4;
  if ((input.years_experience ?? 0) >= 5) { performance += 4; strengths.push("Entrepreneur expérimenté"); }
  else if ((input.years_experience ?? 0) >= 2) performance += 2;

  performance = Math.min(performance, performanceMax);

  // --- D) Visibility (15 points) ---
  let visibility = 0;
  const visibilityMax = 15;

  if (filled(input.logo_url)) visibility += 3;
  if ((input.portfolio_urls?.length ?? 0) >= 3) { visibility += 4; strengths.push("Portfolio avec images"); }
  else if ((input.portfolio_urls?.length ?? 0) >= 1) visibility += 2;
  else { recs.push({ title: "Ajouter des photos de projets", description: "Les photos augmentent votre crédibilité.", importance: "medium", estimatedImpact: 4, section: "visibility" }); }

  if (filled(input.website)) { visibility += 3; }
  if (filled(input.province)) visibility += 2;
  if (filled(input.specialty) && filled(input.city)) visibility += 3;

  visibility = Math.min(visibility, visibilityMax);

  // --- Total ---
  const rawScore = completeness + trust + performance + visibility;
  const score = Math.min(100, Math.max(0, rawScore));

  const grade =
    score >= 80 ? "Excellent" :
    score >= 60 ? "Bon" :
    score >= 40 ? "Moyen" :
    "Faible";

  // Normalize subscores to 0-100
  const completeness_score = Math.round((completeness / completenessMax) * 100);
  const trust_score = Math.round((trust / trustMax) * 100);
  const performance_score = Math.round((performance / performanceMax) * 100);
  const visibility_score = Math.round((visibility / visibilityMax) * 100);

  // Sort recommendations by impact
  recs.sort((a, b) => b.estimatedImpact - a.estimatedImpact);

  return {
    score,
    grade,
    completeness_score,
    trust_score,
    performance_score,
    visibility_score,
    strengths,
    weaknesses,
    missing_items: missing,
    recommendations: recs,
  };
}
