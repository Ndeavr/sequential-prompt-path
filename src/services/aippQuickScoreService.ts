/**
 * UNPRO — AIPP Real Score Service
 * Uses real scraped data from Firecrawl to compute score.
 */

export interface AIPPRealSignals {
  business_name_detected: string;
  title: string;
  description: string;
  has_ssl: boolean;
  has_logo: boolean;
  phones_found: string[];
  emails_found: string[];
  socials_found: string[];
  has_reviews: boolean;
  has_structured_data: boolean;
  services_detected: string[];
  cities_detected: string[];
  internal_pages_count: number;
  total_links_count: number;
  branding_colors: any;
  branding_fonts: any;
}

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
  screenshot?: string | null;
  businessNameDetected?: string;
  citiesDetected?: string[];
  signals?: AIPPRealSignals;
}

/** Compute score from real scraped signals */
export function computeRealAIPPScore(signals: AIPPRealSignals, phone?: string): AIPPQuickResult {
  let score = 0;
  const strengths: string[] = [];
  const quickWins: string[] = [];

  // SSL (0-8)
  if (signals.has_ssl) { score += 8; strengths.push("Connexion sécurisée (HTTPS)"); }
  else { quickWins.push("Activez le HTTPS sur votre site"); }

  // Logo / Branding (0-7)
  if (signals.has_logo) { score += 7; strengths.push("Logo détecté"); }
  else { quickWins.push("Ajoutez un logo professionnel"); }

  // Title & Meta description (0-10)
  if (signals.title && signals.title.length > 10) { score += 5; strengths.push("Titre de page optimisé"); }
  else { quickWins.push("Optimisez le titre de votre page"); }
  if (signals.description && signals.description.length > 30) { score += 5; strengths.push("Meta description présente"); }
  else { quickWins.push("Ajoutez une meta description"); }

  // Phone on site (0-10)
  if (signals.phones_found.length > 0) { score += 10; strengths.push(`Téléphone visible: ${signals.phones_found[0]}`); }
  else if (phone) { score += 3; quickWins.push("Affichez votre numéro sur votre site"); }
  else { quickWins.push("Aucun téléphone visible sur le site"); }

  // Email (0-5)
  if (signals.emails_found.length > 0) { score += 5; strengths.push("Email de contact visible"); }
  else { quickWins.push("Ajoutez un email de contact"); }

  // Social links (0-10)
  if (signals.socials_found.length >= 3) { score += 10; strengths.push(`${signals.socials_found.length} réseaux sociaux connectés`); }
  else if (signals.socials_found.length >= 1) { score += 5; strengths.push(`${signals.socials_found.length} réseau(x) social(aux)`); quickWins.push("Connectez plus de réseaux sociaux"); }
  else { quickWins.push("Connectez vos réseaux sociaux"); }

  // Reviews / Testimonials (0-12)
  if (signals.has_reviews) { score += 12; strengths.push("Avis ou témoignages détectés"); }
  else { quickWins.push("Ajoutez des avis clients sur votre site"); }

  // Structured data (0-12)
  if (signals.has_structured_data) { score += 12; strengths.push("Données structurées détectées"); }
  else { quickWins.push("Données structurées manquantes"); }

  // Services mentioned (0-8)
  if (signals.services_detected.length >= 3) { score += 8; strengths.push(`${signals.services_detected.length} services identifiés`); }
  else if (signals.services_detected.length >= 1) { score += 4; quickWins.push("Détaillez davantage vos services"); }
  else { quickWins.push("Listez clairement vos services"); }

  // City / Local SEO (0-8)
  if (signals.cities_detected.length >= 1) { score += 8; strengths.push(`Zone desservie détectée: ${signals.cities_detected[0]}`); }
  else { quickWins.push("Mentionnez vos zones de service"); }

  // Internal pages / content depth (0-10)
  if (signals.internal_pages_count >= 10) { score += 10; strengths.push(`Site riche: ${signals.internal_pages_count}+ pages`); }
  else if (signals.internal_pages_count >= 5) { score += 6; quickWins.push("Ajoutez plus de contenu à votre site"); }
  else if (signals.internal_pages_count >= 1) { score += 3; quickWins.push("Votre site manque de profondeur"); }
  else { quickWins.push("Créez plus de pages de contenu"); }

  score = Math.min(100, Math.max(0, score));

  const label = score >= 80 ? "Dominant" :
    score >= 60 ? "Fort" :
    score >= 40 ? "Présence correcte" :
    score >= 20 ? "Faible" : "Invisible";

  const marketPosition = score >= 80 ? "vous dominez" :
    score >= 60 ? "loin devant" :
    score >= 40 ? "ex aequo" : "en arrière";

  const message = score >= 80
    ? "Votre profil en ligne est solide. Avec un positionnement IA stratégique, vous pouvez dominer votre marché."
    : score >= 60
    ? "Bonne base, mais plusieurs optimisations rapides vous feraient gagner en visibilité IA."
    : score >= 40
    ? "Vous avez les fondations, mais vos concurrents vous dépassent sur plusieurs fronts critiques."
    : "Votre visibilité en ligne est faible. Vos meilleurs clients ne vous trouvent probablement pas.";

  return {
    score,
    label,
    marketPosition,
    message,
    strengths,
    quickWins,
    businessNameDetected: signals.business_name_detected,
    citiesDetected: signals.cities_detected,
    signals,
  };
}

/** Fallback: compute from minimal input (no scrape) */
export function computeQuickAIPPScore(input: AIPPQuickInput): AIPPQuickResult {
  let score = 0;
  const strengths: string[] = [];
  const quickWins: string[] = [];

  if (input.business_name) {
    const len = input.business_name.trim().length;
    if (len >= 5) { score += 15; strengths.push("Nom d'entreprise défini"); }
    else { score += 8; quickWins.push("Précisez votre nom d'entreprise"); }
  }

  if (input.city && input.city.trim().length > 1) {
    score += 15; strengths.push("Zone géographique identifiée");
  } else { quickWins.push("Indiquez votre ville principale"); }

  if (input.website_url && input.website_url.trim().length > 5) {
    score += 25; strengths.push("Présence web détectée");
  } else { score += 5; quickWins.push("Créez un site web professionnel"); }

  if (input.phone && input.phone.replace(/\D/g, "").length >= 10) {
    score += 15; strengths.push("Numéro de contact disponible");
  } else { quickWins.push("Ajoutez un numéro de téléphone visible"); }

  if (input.google_profile_url && input.google_profile_url.trim().length > 10) {
    score += 30; strengths.push("Profil Google détecté");
  } else { score += 3; quickWins.push("Créez ou optimisez votre fiche Google Business"); }

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
