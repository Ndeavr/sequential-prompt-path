/**
 * UNPRO — Temporary Quote Analysis Engine
 * Deterministic, French-language structured analysis from quote metadata.
 * TEMPORARY: Will be replaced by real AI extraction pipeline.
 */

interface QuoteInput {
  title: string;
  description?: string | null;
  amount?: number | null;
  file_url?: string | null;
}

interface AnalysisOutput {
  summary: string;
  strengths: string[];
  concerns: string[];
  missing_items: string[];
  recommendations: string;
  fairness_score: number | null;
}

const KEYWORDS = {
  warranty: ["garantie", "warranty", "assurance"],
  materials: ["matériaux", "matériel", "materials", "fournitures"],
  timeline: ["délai", "durée", "échéancier", "timeline", "semaines", "jours", "mois"],
  scope: ["portée", "inclus", "travaux", "scope", "étendue"],
  permits: ["permis", "permit", "autorisation", "conformité"],
  labour: ["main-d'œuvre", "labour", "installation"],
  cleanup: ["nettoyage", "cleanup", "débris"],
};

function hasKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function generateTempAnalysis(quote: QuoteInput): AnalysisOutput {
  const combined = `${quote.title} ${quote.description || ""}`.trim();
  const hasFile = !!quote.file_url;
  const hasAmount = quote.amount != null && quote.amount > 0;
  const hasDescription = !!quote.description && quote.description.length > 20;

  const strengths: string[] = [];
  const concerns: string[] = [];
  const missing_items: string[] = [];
  const recommendations: string[] = [];

  // --- Strengths ---
  if (hasFile) strengths.push("Un document a été joint à la soumission.");
  if (hasAmount) strengths.push(`Un montant de ${quote.amount!.toLocaleString("fr-CA")} $ a été indiqué.`);
  if (hasDescription) strengths.push("La description contient des détails utiles.");
  if (hasKeyword(combined, KEYWORDS.warranty)) strengths.push("Mention de garantie détectée — bon signe de confiance.");
  if (hasKeyword(combined, KEYWORDS.materials)) strengths.push("Les matériaux sont mentionnés dans la soumission.");
  if (hasKeyword(combined, KEYWORDS.scope)) strengths.push("La portée des travaux semble décrite.");

  // --- Concerns ---
  if (!hasFile) concerns.push("Aucun document joint — impossible de vérifier les détails.");
  if (!hasAmount) concerns.push("Aucun montant indiqué — difficile d'évaluer le budget.");
  if (!hasDescription || (quote.description && quote.description.length < 10))
    concerns.push("Description très courte ou absente — manque de transparence.");
  if (hasAmount && quote.amount! > 50000)
    concerns.push("Montant élevé — une comparaison avec d'autres soumissions est recommandée.");

  // --- Missing items ---
  if (!hasKeyword(combined, KEYWORDS.warranty)) missing_items.push("Aucune mention de garantie.");
  if (!hasKeyword(combined, KEYWORDS.materials)) missing_items.push("Détail des matériaux non mentionné.");
  if (!hasKeyword(combined, KEYWORDS.timeline)) missing_items.push("Aucun échéancier ou délai mentionné.");
  if (!hasKeyword(combined, KEYWORDS.permits)) missing_items.push("Aucune mention de permis ou conformité.");
  if (!hasKeyword(combined, KEYWORDS.labour)) missing_items.push("Coût de la main-d'œuvre non détaillé.");
  if (!hasKeyword(combined, KEYWORDS.cleanup)) missing_items.push("Nettoyage de chantier non mentionné.");

  // --- Recommendations ---
  recommendations.push("Demandez une ventilation détaillée des coûts (matériaux, main-d'œuvre, frais).");
  if (!hasFile) recommendations.push("Demandez un document formel écrit à l'entrepreneur.");
  if (missing_items.length > 3)
    recommendations.push("Cette soumission manque plusieurs éléments importants — comparez avec d'autres entrepreneurs.");
  recommendations.push("Vérifiez les licences et assurances de l'entrepreneur avant d'accepter.");
  if (hasAmount && quote.amount! > 10000)
    recommendations.push("Pour ce montant, obtenez au moins 3 soumissions comparables.");

  // --- Score ---
  let score: number | null = null;
  if (hasFile || hasAmount || hasDescription) {
    let s = 40;
    if (hasFile) s += 15;
    if (hasAmount) s += 10;
    if (hasDescription) s += 10;
    if (strengths.length >= 3) s += 10;
    s -= Math.min(missing_items.length * 3, 15);
    score = Math.max(20, Math.min(95, s));
  }

  // --- Summary ---
  const quality = score && score >= 60 ? "correcte" : "incomplète";
  const summary = `Analyse préliminaire : cette soumission semble ${quality}. ${strengths.length} point(s) positif(s) identifié(s) et ${concerns.length} point(s) à vérifier. ${missing_items.length} élément(s) souvent attendu(s) n'ont pas été détecté(s).`;

  return {
    summary,
    strengths,
    concerns,
    missing_items,
    recommendations: recommendations.join(" "),
    fairness_score: score,
  };
}
