import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Signal definitions ───
type SignalResult = {
  key: string;
  group: "web" | "google" | "trust" | "ai_visibility" | "conversion";
  source: string;
  found: boolean;
  rawValue?: unknown;
  normalizedValue?: unknown;
  maxPoints: number;
  earnedPoints: number;
  reason: string;
  blocker?: string | null;
  strength?: string | null;
  recommendation?: string | null;
};

// ─── Scoring helpers ───
function scoreBoolean(found: boolean, max: number): number {
  return found ? max : 0;
}

function scoreGbpRating(rating?: number): number {
  if (!rating) return 0;
  if (rating >= 4.8) return 4;
  if (rating >= 4.5) return 3;
  if (rating >= 4.2) return 2;
  if (rating >= 3.8) return 1;
  return 0;
}

function scoreGbpReviewCount(count?: number): number {
  if (!count) return 0;
  if (count >= 100) return 4;
  if (count >= 50) return 3;
  if (count >= 20) return 2;
  if (count >= 5) return 1;
  return 0;
}

function scoreServicePages(count?: number): number {
  if (!count) return 0;
  if (count >= 8) return 3;
  if (count >= 4) return 2;
  if (count >= 1) return 1;
  return 0;
}

function scoreLocationPages(count?: number): number {
  if (!count) return 0;
  if (count >= 8) return 2;
  if (count >= 2) return 1;
  return 0;
}

function scoreOwnerResponses(percent?: number): number {
  if (percent == null) return 0;
  if (percent >= 70) return 2;
  if (percent >= 30) return 1;
  return 0;
}

function scoreRecentReviews(count?: number): number {
  if (!count) return 0;
  if (count >= 10) return 2;
  if (count >= 2) return 1;
  return 0;
}

function computeConfidence(input: {
  hasWebsiteScan: boolean;
  hasGoogleScan: boolean;
  hasVerificationScan: boolean;
  validatedSourcesCount: number;
  validatedSignalsCount: number;
}): "low" | "medium" | "high" {
  if (
    input.hasWebsiteScan && input.hasGoogleScan && input.hasVerificationScan &&
    input.validatedSourcesCount >= 3 && input.validatedSignalsCount >= 15
  ) return "high";
  if (input.validatedSourcesCount >= 2 && input.validatedSignalsCount >= 8) return "medium";
  return "low";
}

function canShowFinalScore(validatedSourcesCount: number, validatedSignalsCount: number): boolean {
  return validatedSourcesCount >= 1 && validatedSignalsCount >= 5;
}

function computePotentialScore(current: number, missingFixable: number): number {
  return Math.min(100, current + Math.min(missingFixable, 25));
}

// ─── Website signal collection via Firecrawl ───
async function collectWebsiteSignals(contractor: any): Promise<SignalResult[]> {
  const signals: SignalResult[] = [];
  const url = contractor.website;

  if (!url) {
    // All web + ai_visibility + conversion signals get 0
    const webKeys = [
      { key: "website_live", max: 3, group: "web" as const },
      { key: "https_enabled", max: 2, group: "web" as const },
      { key: "mobile_friendly", max: 3, group: "web" as const },
      { key: "title_present", max: 1, group: "web" as const },
      { key: "meta_description_present", max: 1, group: "web" as const },
      { key: "h1_present", max: 2, group: "web" as const },
      { key: "contact_page_present", max: 2, group: "web" as const },
      { key: "service_pages_count", max: 3, group: "web" as const },
      { key: "location_pages_count", max: 2, group: "web" as const },
      { key: "page_speed_baseline", max: 1, group: "web" as const },
    ];
    const aiKeys = [
      { key: "local_business_schema", max: 5, group: "ai_visibility" as const },
      { key: "clear_service_content", max: 4, group: "ai_visibility" as const },
      { key: "faq_present", max: 3, group: "ai_visibility" as const },
      { key: "service_areas_present", max: 4, group: "ai_visibility" as const },
      { key: "semantic_headings", max: 3, group: "ai_visibility" as const },
      { key: "internal_linking", max: 2, group: "ai_visibility" as const },
      { key: "crawlable_text", max: 2, group: "ai_visibility" as const },
      { key: "indexable_unique_content", max: 2, group: "ai_visibility" as const },
    ];
    const convKeys = [
      { key: "primary_cta_visible", max: 3, group: "conversion" as const },
      { key: "clickable_phone", max: 2, group: "conversion" as const },
      { key: "quote_form_present", max: 3, group: "conversion" as const },
      { key: "trust_badges_present", max: 2, group: "conversion" as const },
      { key: "proof_visuals_present", max: 2, group: "conversion" as const },
      { key: "testimonials_present", max: 2, group: "conversion" as const },
      { key: "booking_path_clear", max: 1, group: "conversion" as const },
    ];
    for (const s of [...webKeys, ...aiKeys, ...convKeys]) {
      signals.push({
        key: s.key, group: s.group, source: "website", found: false, maxPoints: s.max, earnedPoints: 0,
        reason: "Aucun site web fourni",
        blocker: s.key === "website_live" ? "Aucun site web détecté. Les IA ne peuvent pas analyser votre entreprise." : null,
      });
    }
    return signals;
  }

  // Scrape via Firecrawl
  let markdown = "";
  let html = "";
  let links: string[] = [];
  let metadata: any = {};

  try {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");

    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown", "html", "links"], onlyMainContent: false }),
    });
    const data = await res.json();
    if (data.success) {
      markdown = data.markdown || data.data?.markdown || "";
      html = data.html || data.data?.html || "";
      links = data.links || data.data?.links || [];
      metadata = data.metadata || data.data?.metadata || {};
    }
  } catch (e) {
    console.error("Firecrawl error:", e);
  }

  const hasContent = markdown.length > 100 || html.length > 100;
  const lowerHtml = html.toLowerCase();
  const lowerMd = markdown.toLowerCase();

  // Web Presence /20
  signals.push({
    key: "website_live", group: "web", source: "website", found: hasContent, maxPoints: 3,
    earnedPoints: scoreBoolean(hasContent, 3), reason: hasContent ? "Site accessible" : "Site inaccessible",
    blocker: !hasContent ? "Votre site web est inaccessible ou ne contient pas de contenu exploitable." : null,
    strength: hasContent ? "Votre site web est en ligne et accessible." : null,
  });

  const isHttps = url.startsWith("https");
  signals.push({
    key: "https_enabled", group: "web", source: "website", found: isHttps, maxPoints: 2,
    earnedPoints: scoreBoolean(isHttps, 2), reason: isHttps ? "HTTPS actif" : "HTTPS manquant",
    blocker: !isHttps ? "Votre site n'utilise pas HTTPS, ce qui réduit la confiance des visiteurs et des moteurs." : null,
  });

  const hasViewport = lowerHtml.includes("viewport");
  signals.push({
    key: "mobile_friendly", group: "web", source: "website", found: hasViewport, maxPoints: 3,
    earnedPoints: scoreBoolean(hasViewport, 3), reason: hasViewport ? "Balise viewport détectée" : "Pas de viewport",
    blocker: !hasViewport ? "Votre site ne semble pas optimisé pour mobile." : null,
  });

  const hasTitle = !!metadata.title || lowerHtml.includes("<title>");
  signals.push({
    key: "title_present", group: "web", source: "website", found: hasTitle, maxPoints: 1,
    earnedPoints: scoreBoolean(hasTitle, 1), reason: hasTitle ? "Titre détecté" : "Pas de titre",
  });

  const hasMeta = !!metadata.description || lowerHtml.includes('name="description"');
  signals.push({
    key: "meta_description_present", group: "web", source: "website", found: hasMeta, maxPoints: 1,
    earnedPoints: scoreBoolean(hasMeta, 1), reason: hasMeta ? "Méta-description détectée" : "Pas de méta-description",
  });

  const hasH1 = lowerHtml.includes("<h1") || /^# /m.test(markdown);
  signals.push({
    key: "h1_present", group: "web", source: "website", found: hasH1, maxPoints: 2,
    earnedPoints: scoreBoolean(hasH1, 2), reason: hasH1 ? "H1 détecté" : "Pas de H1",
  });

  const hasContact = lowerMd.includes("contact") || links.some((l: string) => l.toLowerCase().includes("contact"));
  signals.push({
    key: "contact_page_present", group: "web", source: "website", found: hasContact, maxPoints: 2,
    earnedPoints: scoreBoolean(hasContact, 2), reason: hasContact ? "Page contact détectée" : "Pas de page contact",
  });

  // Count service-like pages
  const serviceLinks = links.filter((l: string) => {
    const lower = l.toLowerCase();
    return lower.includes("service") || lower.includes("travaux") || lower.includes("renovation")
      || lower.includes("plomberie") || lower.includes("electrici") || lower.includes("toiture");
  });
  const serviceCount = serviceLinks.length;
  signals.push({
    key: "service_pages_count", group: "web", source: "website", found: serviceCount > 0, maxPoints: 3,
    earnedPoints: scoreServicePages(serviceCount), rawValue: serviceCount,
    reason: serviceCount > 0 ? `${serviceCount} page(s) de services détectée(s)` : "Aucune page de services",
    blocker: serviceCount === 0 ? "Aucune page dédiée à vos services n'a été détectée." : null,
    recommendation: serviceCount < 4 ? "Créez des pages individuelles pour chaque service offert." : null,
  });

  const locationLinks = links.filter((l: string) => {
    const lower = l.toLowerCase();
    return lower.includes("laval") || lower.includes("montreal") || lower.includes("longueuil")
      || lower.includes("quebec") || lower.includes("sherbrooke") || lower.includes("gatineau")
      || lower.includes("region") || lower.includes("zone");
  });
  const locationCount = locationLinks.length;
  signals.push({
    key: "location_pages_count", group: "web", source: "website", found: locationCount > 0, maxPoints: 2,
    earnedPoints: scoreLocationPages(locationCount), rawValue: locationCount,
    reason: locationCount > 0 ? `${locationCount} page(s) locale(s)` : "Aucune page locale",
    recommendation: locationCount < 2 ? "Ajoutez des pages dédiées par ville ou zone desservie." : null,
  });

  signals.push({
    key: "page_speed_baseline", group: "web", source: "website", found: hasContent, maxPoints: 1,
    earnedPoints: hasContent ? 1 : 0, reason: hasContent ? "Contenu chargé" : "Non mesurable",
  });

  // AI Visibility /25
  const hasSchema = lowerHtml.includes("localbusiness") || lowerHtml.includes("application/ld+json");
  signals.push({
    key: "local_business_schema", group: "ai_visibility", source: "website", found: hasSchema, maxPoints: 5,
    earnedPoints: scoreBoolean(hasSchema, 5), reason: hasSchema ? "Schema LocalBusiness détecté" : "Aucun schema structuré",
    blocker: !hasSchema ? "Les IA comprennent mal votre entreprise parce qu'aucune donnée structurée claire n'a été détectée." : null,
    strength: hasSchema ? "Vos données structurées aident les IA à comprendre votre entreprise." : null,
    recommendation: !hasSchema ? "Ajoutez un balisage LocalBusiness et structurez clairement vos services." : null,
  });

  const wordCount = markdown.split(/\s+/).length;
  const hasServiceContent = wordCount > 200 && serviceCount > 0;
  signals.push({
    key: "clear_service_content", group: "ai_visibility", source: "website", found: hasServiceContent, maxPoints: 4,
    earnedPoints: scoreBoolean(hasServiceContent, 4), rawValue: wordCount,
    reason: hasServiceContent ? "Contenu de services détaillé" : "Contenu insuffisant",
  });

  const hasFaq = lowerMd.includes("faq") || lowerMd.includes("questions fréquentes") || lowerHtml.includes("faqpage");
  signals.push({
    key: "faq_present", group: "ai_visibility", source: "website", found: hasFaq, maxPoints: 3,
    earnedPoints: scoreBoolean(hasFaq, 3), reason: hasFaq ? "FAQ détectée" : "Aucune FAQ",
    recommendation: !hasFaq ? "Ajoutez une section FAQ pour améliorer votre visibilité dans les réponses IA." : null,
  });

  const hasServiceAreas = lowerMd.includes("zone") || lowerMd.includes("desser") || lowerMd.includes("région")
    || lowerMd.includes("laval") || lowerMd.includes("montréal");
  signals.push({
    key: "service_areas_present", group: "ai_visibility", source: "website", found: hasServiceAreas, maxPoints: 4,
    earnedPoints: scoreBoolean(hasServiceAreas, 4), reason: hasServiceAreas ? "Zones de service mentionnées" : "Aucune zone",
    blocker: !hasServiceAreas ? "Votre présence locale manque de profondeur. Peu de zones de service détectées." : null,
  });

  const headingCount = (markdown.match(/^#{1,3} /gm) || []).length;
  const hasSemanticHeadings = headingCount >= 3;
  signals.push({
    key: "semantic_headings", group: "ai_visibility", source: "website", found: hasSemanticHeadings, maxPoints: 3,
    earnedPoints: scoreBoolean(hasSemanticHeadings, 3), rawValue: headingCount,
    reason: hasSemanticHeadings ? `${headingCount} titres structurés` : "Structure de titres insuffisante",
  });

  const internalLinkCount = links.filter((l: string) => {
    try { return new URL(l).hostname === new URL(url).hostname; } catch { return false; }
  }).length;
  signals.push({
    key: "internal_linking", group: "ai_visibility", source: "website", found: internalLinkCount >= 5, maxPoints: 2,
    earnedPoints: internalLinkCount >= 5 ? 2 : internalLinkCount >= 2 ? 1 : 0, rawValue: internalLinkCount,
    reason: `${internalLinkCount} liens internes`,
  });

  signals.push({
    key: "crawlable_text", group: "ai_visibility", source: "website", found: wordCount > 100, maxPoints: 2,
    earnedPoints: wordCount > 100 ? 2 : 0, reason: wordCount > 100 ? "Texte exploitable" : "Trop peu de texte",
  });

  signals.push({
    key: "indexable_unique_content", group: "ai_visibility", source: "website", found: wordCount > 300, maxPoints: 2,
    earnedPoints: wordCount > 300 ? 2 : 0, reason: wordCount > 300 ? "Contenu unique suffisant" : "Contenu trop mince",
  });

  // Conversion /15
  const hasCta = lowerMd.includes("soumission") || lowerMd.includes("estimation") || lowerMd.includes("devis")
    || lowerMd.includes("appelez") || lowerHtml.includes("cta") || lowerMd.includes("demandez");
  signals.push({
    key: "primary_cta_visible", group: "conversion", source: "website", found: hasCta, maxPoints: 3,
    earnedPoints: scoreBoolean(hasCta, 3), reason: hasCta ? "Appel à l'action détecté" : "Aucun CTA visible",
    blocker: !hasCta ? "Votre conversion mobile semble faible. Le chemin pour demander une estimation n'est pas assez rapide." : null,
  });

  const phonePattern = /tel:|href="tel:/i;
  const hasClickablePhone = phonePattern.test(html);
  signals.push({
    key: "clickable_phone", group: "conversion", source: "website", found: hasClickablePhone, maxPoints: 2,
    earnedPoints: scoreBoolean(hasClickablePhone, 2), reason: hasClickablePhone ? "Téléphone cliquable" : "Pas de tel: link",
  });

  const hasForm = lowerHtml.includes("<form") || lowerHtml.includes("formspree") || lowerMd.includes("formulaire");
  signals.push({
    key: "quote_form_present", group: "conversion", source: "website", found: hasForm, maxPoints: 3,
    earnedPoints: scoreBoolean(hasForm, 3), reason: hasForm ? "Formulaire détecté" : "Aucun formulaire",
    recommendation: !hasForm ? "Ajoutez un formulaire de demande de soumission visible." : null,
  });

  const hasTrustBadges = lowerMd.includes("rbq") || lowerMd.includes("certifi") || lowerMd.includes("licen")
    || lowerMd.includes("assur") || lowerMd.includes("garanti");
  signals.push({
    key: "trust_badges_present", group: "conversion", source: "website", found: hasTrustBadges, maxPoints: 2,
    earnedPoints: scoreBoolean(hasTrustBadges, 2), reason: hasTrustBadges ? "Badges de confiance" : "Aucun badge",
  });

  const hasProofVisuals = lowerHtml.includes("portfolio") || lowerHtml.includes("gallery")
    || lowerMd.includes("réalisation") || lowerMd.includes("projet");
  signals.push({
    key: "proof_visuals_present", group: "conversion", source: "website", found: hasProofVisuals, maxPoints: 2,
    earnedPoints: scoreBoolean(hasProofVisuals, 2), reason: hasProofVisuals ? "Preuves visuelles" : "Aucune preuve visuelle",
  });

  const hasTestimonials = lowerMd.includes("témoignage") || lowerMd.includes("avis") || lowerMd.includes("review")
    || lowerMd.includes("client satisfait");
  signals.push({
    key: "testimonials_present", group: "conversion", source: "website", found: hasTestimonials, maxPoints: 2,
    earnedPoints: scoreBoolean(hasTestimonials, 2), reason: hasTestimonials ? "Témoignages détectés" : "Aucun témoignage",
  });

  const hasBooking = lowerMd.includes("rendez-vous") || lowerMd.includes("réserv") || lowerMd.includes("planifi")
    || lowerHtml.includes("calendly") || lowerHtml.includes("booking");
  signals.push({
    key: "booking_path_clear", group: "conversion", source: "website", found: hasBooking, maxPoints: 1,
    earnedPoints: scoreBoolean(hasBooking, 1), reason: hasBooking ? "Chemin de réservation" : "Pas de réservation",
  });

  return signals;
}

// ─── Google signals ───
function collectGoogleSignals(contractor: any): SignalResult[] {
  const signals: SignalResult[] = [];
  const hasGbp = !!contractor.google_business_url;

  signals.push({
    key: "gbp_found", group: "google", source: "google", found: hasGbp, maxPoints: 4,
    earnedPoints: scoreBoolean(hasGbp, 4), reason: hasGbp ? "Fiche Google détectée" : "Aucune fiche Google",
    blocker: !hasGbp ? "Votre entreprise n'a pas de fiche Google Business visible." : null,
    strength: hasGbp ? "Votre présence Google est bien établie." : null,
  });

  const rating = contractor.rating ? parseFloat(contractor.rating) : undefined;
  signals.push({
    key: "gbp_rating", group: "google", source: "google", found: !!rating, maxPoints: 4,
    earnedPoints: scoreGbpRating(rating), rawValue: rating,
    reason: rating ? `Note ${rating}/5` : "Aucune note",
    strength: rating && rating >= 4.5 ? "Votre note Google est excellente." : null,
  });

  const reviewCount = contractor.review_count || 0;
  signals.push({
    key: "gbp_reviews_count", group: "google", source: "google", found: reviewCount > 0, maxPoints: 4,
    earnedPoints: scoreGbpReviewCount(reviewCount), rawValue: reviewCount,
    reason: reviewCount > 0 ? `${reviewCount} avis` : "Aucun avis",
    recommendation: reviewCount < 20 ? "Encouragez vos clients satisfaits à laisser un avis Google." : null,
  });

  // Without live Google API, these are scored as unavailable
  signals.push({
    key: "gbp_recent_reviews", group: "google", source: "google", found: false, maxPoints: 2,
    earnedPoints: 0, reason: "Données non disponibles sans API Google",
  });

  signals.push({
    key: "gbp_owner_responses", group: "google", source: "google", found: false, maxPoints: 2,
    earnedPoints: 0, reason: "Données non disponibles sans API Google",
  });

  signals.push({
    key: "gbp_photos_present", group: "google", source: "google", found: false, maxPoints: 2,
    earnedPoints: 0, reason: "Données non disponibles sans API Google",
  });

  signals.push({
    key: "gbp_category_and_hours", group: "google", source: "google", found: false, maxPoints: 2,
    earnedPoints: 0, reason: "Données non disponibles sans API Google",
  });

  return signals;
}

// ─── Trust & verification signals ───
function collectVerificationSignals(contractor: any): SignalResult[] {
  const signals: SignalResult[] = [];

  const rbqPattern = /^\d{4}-\d{4}-\d{2}$/;
  const hasRbq = !!contractor.rbq_number;
  const rbqValid = hasRbq && rbqPattern.test(contractor.rbq_number);
  signals.push({
    key: "rbq_valid", group: "trust", source: "rbq", found: rbqValid, maxPoints: 8,
    earnedPoints: rbqValid ? 8 : hasRbq ? 4 : 0, rawValue: contractor.rbq_number,
    reason: rbqValid ? "Numéro RBQ valide" : hasRbq ? "Format RBQ non standard" : "Aucun RBQ",
    blocker: !hasRbq ? "Aucun numéro de licence RBQ n'a été fourni." : null,
    strength: rbqValid ? "Votre licence RBQ est valide et vérifiable." : null,
  });

  const hasNeq = !!contractor.neq;
  signals.push({
    key: "neq_active", group: "trust", source: "neq", found: hasNeq, maxPoints: 5,
    earnedPoints: hasNeq ? 5 : 0, rawValue: contractor.neq,
    reason: hasNeq ? "NEQ détecté" : "Aucun NEQ",
    strength: hasNeq ? "Votre numéro d'entreprise est enregistré." : null,
  });

  const hasLegal = !!contractor.legal_name;
  const nameConsistent = hasLegal
    ? contractor.legal_name.toLowerCase().includes(contractor.business_name.toLowerCase().split(" ")[0])
    : true;
  signals.push({
    key: "business_name_consistency", group: "trust", source: "internal", found: nameConsistent, maxPoints: 3,
    earnedPoints: nameConsistent ? 3 : 1,
    reason: nameConsistent ? "Nom d'entreprise cohérent" : "Incohérence entre le nom commercial et légal",
  });

  const hasPhone = !!contractor.phone;
  const hasEmail = !!contractor.email;
  signals.push({
    key: "contact_consistency", group: "trust", source: "internal", found: hasPhone && hasEmail, maxPoints: 2,
    earnedPoints: (hasPhone && hasEmail) ? 2 : (hasPhone || hasEmail) ? 1 : 0,
    reason: (hasPhone && hasEmail) ? "Coordonnées complètes" : "Coordonnées incomplètes",
  });

  const hasCity = !!contractor.city;
  signals.push({
    key: "address_or_service_area_clarity", group: "trust", source: "internal", found: hasCity, maxPoints: 2,
    earnedPoints: hasCity ? 2 : 0,
    reason: hasCity ? "Zone de service claire" : "Aucune zone définie",
    strength: hasCity ? "Votre identité d'entreprise semble cohérente." : null,
  });

  return signals;
}

// ─── Main scoring ───
function computeAippScore(signals: SignalResult[]) {
  const categoryScores = { web: 0, google: 0, trust: 0, aiVisibility: 0, conversion: 0 };

  const sourcesUsed = Array.from(new Set(signals.filter(s => s.found).map(s => s.source)));
  const validatedSourcesCount = sourcesUsed.length;
  const validatedSignalsCount = signals.filter(s => s.found).length;
  const totalPossibleSignalsCount = signals.length;

  const blockers = signals.filter(s => !s.found && s.blocker).map(s => ({
    key: s.key, text: s.blocker, source: s.source,
    technical_key: s.key,
    business_text: s.blocker,
    fix_text: s.recommendation || null,
  }));

  const strengths = signals.filter(s => s.found && s.strength).map(s => ({
    key: s.key, text: s.strength, source: s.source,
  }));

  const recommendations = signals.filter(s => s.recommendation).map(s => ({
    key: s.key, text: s.recommendation,
  }));

  for (const signal of signals) {
    if (signal.group === "web") categoryScores.web += signal.earnedPoints;
    if (signal.group === "google") categoryScores.google += signal.earnedPoints;
    if (signal.group === "trust") categoryScores.trust += signal.earnedPoints;
    if (signal.group === "ai_visibility") categoryScores.aiVisibility += signal.earnedPoints;
    if (signal.group === "conversion") categoryScores.conversion += signal.earnedPoints;
  }

  const overallScore = categoryScores.web + categoryScores.google + categoryScores.trust
    + categoryScores.aiVisibility + categoryScores.conversion;

  const missingFixablePoints = signals.filter(s => !s.found).reduce((sum, s) => sum + s.maxPoints, 0);
  const potentialScore = computePotentialScore(overallScore, missingFixablePoints);
  const showFinal = canShowFinalScore(validatedSourcesCount, validatedSignalsCount);

  const confidenceInput = {
    hasWebsiteScan: signals.some(s => s.source === "website" && s.found),
    hasGoogleScan: signals.some(s => s.source === "google" && s.found),
    hasVerificationScan: signals.some(s => (s.source === "rbq" || s.source === "neq") && s.found),
    validatedSourcesCount,
    validatedSignalsCount,
  };

  return {
    overallScore, potentialScore, categoryScores, sourcesUsed,
    blockers: blockers.slice(0, 5), strengths: strengths.slice(0, 5),
    recommendations: recommendations.slice(0, 5),
    rawSignals: signals,
    scoringDetails: { signals, formulas_version: "aipp_v1" },
    validatedSourcesCount, validatedSignalsCount, totalPossibleSignalsCount,
    canShowFinalScore: showFinal,
    confidenceInput,
  };
}

async function persistSignals(supabase: any, contractorId: string, auditId: string, signals: SignalResult[]) {
  if (signals.length === 0) return;
  const rows = signals.map(s => ({
    contractor_id: contractorId,
    audit_id: auditId,
    signal_key: s.key,
    signal_group: s.group,
    signal_value: { raw: s.rawValue, found: s.found, reason: s.reason },
    normalized_value: { earned: s.earnedPoints, max: s.maxPoints },
    source: s.source,
    status: s.found ? "detected" : "missing",
  }));
  await supabase.from("contractor_aipp_signal_logs").insert(rows);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { contractor_id } = await req.json();
    if (!contractor_id) {
      return new Response(JSON.stringify({ error: "contractor_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contractor, error: cErr } = await supabase
      .from("contractors").select("*").eq("id", contractor_id).single();

    if (cErr || !contractor) {
      return new Response(JSON.stringify({ error: "contractor not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create audit
    const { data: audit } = await supabase.from("contractor_aipp_audits").insert({
      contractor_id, analysis_status: "running", started_at: new Date().toISOString(),
    }).select().single();

    // Create job
    const { data: job } = await supabase.from("contractor_aipp_jobs").insert({
      contractor_id, audit_id: audit.id, job_type: "full_audit", status: "running",
      progress_percent: 5, started_at: new Date().toISOString(), step_key: "initializing",
    }).select().single();

    // Collect website signals
    const websiteSignals = await collectWebsiteSignals(contractor);
    await persistSignals(supabase, contractor_id, audit.id, websiteSignals);
    await supabase.from("contractor_aipp_jobs").update({ progress_percent: 35, step_key: "website_scan" }).eq("id", job.id);

    // Collect google signals
    const googleSignals = collectGoogleSignals(contractor);
    await persistSignals(supabase, contractor_id, audit.id, googleSignals);
    await supabase.from("contractor_aipp_jobs").update({ progress_percent: 65, step_key: "google_scan" }).eq("id", job.id);

    // Collect verification signals
    const verificationSignals = collectVerificationSignals(contractor);
    await persistSignals(supabase, contractor_id, audit.id, verificationSignals);
    await supabase.from("contractor_aipp_jobs").update({ progress_percent: 80, step_key: "scoring" }).eq("id", job.id);

    // Compute scores
    const allSignals = [...websiteSignals, ...googleSignals, ...verificationSignals];
    const scoring = computeAippScore(allSignals);
    const confidenceLevel = computeConfidence(scoring.confidenceInput);
    const analysisStatus = scoring.canShowFinalScore ? "complete" : "partial";

    // Update audit
    await supabase.from("contractor_aipp_audits").update({
      analysis_status: analysisStatus,
      confidence_level: confidenceLevel,
      overall_score: scoring.canShowFinalScore ? scoring.overallScore : null,
      web_score: scoring.categoryScores.web,
      google_score: scoring.categoryScores.google,
      trust_score: scoring.categoryScores.trust,
      ai_visibility_score: scoring.categoryScores.aiVisibility,
      conversion_score: scoring.categoryScores.conversion,
      sources_used: scoring.sourcesUsed,
      blockers: scoring.blockers,
      strengths: scoring.strengths,
      recommendations: scoring.recommendations,
      raw_signals: scoring.rawSignals,
      scoring_details: scoring.scoringDetails,
      validated_sources_count: scoring.validatedSourcesCount,
      validated_signals_count: scoring.validatedSignalsCount,
      total_possible_signals_count: scoring.totalPossibleSignalsCount,
      potential_score: scoring.potentialScore,
      completed_at: new Date().toISOString(),
    }).eq("id", audit.id);

    // Complete job
    await supabase.from("contractor_aipp_jobs").update({
      status: "complete", progress_percent: 100, step_key: "done",
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);

    return new Response(JSON.stringify({
      success: true, audit_id: audit.id, contractor_id,
      overall_score: scoring.canShowFinalScore ? scoring.overallScore : null,
      analysis_status: analysisStatus, confidence_level: confidenceLevel,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("aipp-run-audit error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
