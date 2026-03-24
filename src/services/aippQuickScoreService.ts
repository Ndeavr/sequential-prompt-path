/**
 * UNPRO — AIPP Quick Score Service
 * Lightweight scoring for landing page quick checks.
 * Uses minimal input to generate an indicative score.
 */

export interface AIPPQuickInput {
  business_name: string;
  city: string;
  website_url?: string;
  phone?: string;
  google_profile_url?: string;
}

export interface AIPPQuickResult {
  score: number;
  label: string;
  marketPosition: string;
  message: string;
  strengths: string[];
  quickWins: string[];
}

export function computeQuickAIPPScore(input: AIPPQuickInput): AIPPQuickResult {
  let score = 0;
  const strengths: string[] = [];
  const quickWins: string[] = [];

  // Business name quality (0-15)
  if (input.business_name) {
    const len = input.business_name.trim().length;
    if (len >= 5) { score += 15; strengths.push("Nom d'entreprise défini"); }
    else { score += 8; quickWins.push("Précisez votre nom d'entreprise"); }
  }

  // City presence (0-15)
  if (input.city && input.city.trim().length > 1) {
    score += 15;
    strengths.push("Zone géographique identifiée");
  } else {
    quickWins.push("Indiquez votre ville principale");
  }

  // Website (0-25)
  if (input.website_url && input.website_url.trim().length > 5) {
    score += 25;
    strengths.push("Présence web détectée");
  } else {
    score += 5; // partial credit for existing without website
    quickWins.push("Créez un site web ou une page professionnelle");
  }

  // Phone (0-15)
  if (input.phone && input.phone.replace(/\D/g, "").length >= 10) {
    score += 15;
    strengths.push("Numéro de contact disponible");
  } else {
    quickWins.push("Ajoutez un numéro de téléphone visible");
  }

  // Google profile (0-30)
  if (input.google_profile_url && input.google_profile_url.trim().length > 10) {
    score += 30;
    strengths.push("Profil Google détecté");
  } else {
    score += 3;
    quickWins.push("Créez ou optimisez votre fiche Google Business");
  }

  score = Math.min(100, Math.max(0, score));

  const label = score >= 80 ? "Dominant" :
    score >= 60 ? "Fort" :
    score >= 40 ? "Présence correcte" :
    score >= 20 ? "Faible" : "Invisible";

  const marketPosition = score >= 80 ? "vous dominez" :
    score >= 60 ? "loin devant" :
    score >= 40 ? "ex aequo" : "en arrière";

  const message = score >= 80
    ? "Votre profil est solide, mais peut encore monter avec un positionnement IA stratégique."
    : score >= 60
    ? "Votre entreprise a une base, mais plusieurs gains rapides sont encore disponibles."
    : score >= 40
    ? "Vous avez les fondations, mais vos concurrents vous dépassent sur plusieurs fronts."
    : "Vous êtes peu visible pour l'instant. Vos meilleurs clients ne vous trouvent probablement pas.";

  return { score, label, marketPosition, message, strengths, quickWins };
}
