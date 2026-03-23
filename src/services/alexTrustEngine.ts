/**
 * AlexTrustEngine — Helps users trust contractors.
 * AlexComparisonEngine — Compares quotes simply.
 * AlexBookingCopilot — Guides booking completion.
 * AlexBookingRecovery — Recovers incomplete bookings.
 * AlexGrowthEngine — Upsell, cross-sell, upgrade suggestions.
 */

// ═══════════════════════════════════════════
// TRUST ENGINE
// ═══════════════════════════════════════════
export interface TrustSignal {
  type: "license" | "insurance" | "reviews" | "years" | "certifications" | "verified";
  label: string;
  value: string;
  strength: "strong" | "moderate" | "weak";
}

export interface TrustAnalysis {
  overallTrust: "high" | "medium" | "low";
  score: number; // 0-100
  signals: TrustSignal[];
  alexSummary: string;
  riskFactors: string[];
}

export function analyzeTrust(contractor: {
  license_number?: string;
  insurance_info?: string;
  years_experience?: number;
  aipp_score?: number;
  admin_verified?: boolean;
}): TrustAnalysis {
  const signals: TrustSignal[] = [];
  let score = 30; // Base

  if (contractor.license_number) {
    signals.push({ type: "license", label: "Licence RBQ", value: contractor.license_number, strength: "strong" });
    score += 20;
  }
  if (contractor.insurance_info) {
    signals.push({ type: "insurance", label: "Assurance", value: "Confirmée", strength: "strong" });
    score += 15;
  }
  if (contractor.years_experience && contractor.years_experience >= 5) {
    signals.push({ type: "years", label: "Expérience", value: `${contractor.years_experience} ans`, strength: contractor.years_experience >= 10 ? "strong" : "moderate" });
    score += 10;
  }
  if (contractor.admin_verified) {
    signals.push({ type: "verified", label: "Vérifié UnPRO", value: "Oui", strength: "strong" });
    score += 15;
  }

  score = Math.min(score, 100);
  const risks: string[] = [];
  if (!contractor.license_number) risks.push("Licence non confirmée");
  if (!contractor.insurance_info) risks.push("Assurance non vérifiée");

  const overallTrust = score >= 70 ? "high" : score >= 45 ? "medium" : "low";

  return {
    overallTrust,
    score,
    signals,
    alexSummary: overallTrust === "high"
      ? "Cet entrepreneur a de bons signaux de confiance."
      : overallTrust === "medium"
      ? "Quelques éléments à valider avant de confirmer."
      : "Je recommande de vérifier quelques points avant d'aller plus loin.",
    riskFactors: risks,
  };
}

// ═══════════════════════════════════════════
// COMPARISON ENGINE
// ═══════════════════════════════════════════
export interface QuoteComparison {
  cheapest: string;
  mostComplete: string;
  recommended: string;
  alexSummary: string;
  differences: string[];
}

export function compareQuotes(
  quotes: Array<{ name: string; price: number; includes: string[]; warranty?: string }>
): QuoteComparison {
  if (quotes.length < 2) {
    return {
      cheapest: quotes[0]?.name ?? "",
      mostComplete: quotes[0]?.name ?? "",
      recommended: quotes[0]?.name ?? "",
      alexSummary: "Il faudrait au moins deux soumissions pour comparer.",
      differences: [],
    };
  }

  const sorted = [...quotes].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0].name;
  const mostComplete = [...quotes].sort((a, b) => b.includes.length - a.includes.length)[0].name;

  // Simple recommendation: best value = most includes per dollar
  const bestValue = [...quotes].sort(
    (a, b) => b.includes.length / b.price - a.includes.length / a.price
  )[0].name;

  const diffs: string[] = [];
  if (sorted[sorted.length - 1].price > sorted[0].price * 1.5) {
    diffs.push(`L'écart de prix est important : ${sorted[0].price}$ vs ${sorted[sorted.length - 1].price}$`);
  }
  const allIncludes = new Set(quotes.flatMap((q) => q.includes));
  for (const item of allIncludes) {
    const has = quotes.filter((q) => q.includes.includes(item));
    if (has.length < quotes.length) {
      diffs.push(`${item} : inclus seulement par ${has.map((h) => h.name).join(", ")}`);
    }
  }

  return {
    cheapest,
    mostComplete,
    recommended: bestValue,
    alexSummary: `Le meilleur rapport qualité-prix semble être ${bestValue}. ${cheapest !== bestValue ? `${cheapest} est moins cher mais inclut moins.` : ""}`,
    differences: diffs.slice(0, 5),
  };
}

// ═══════════════════════════════════════════
// BOOKING COPILOT
// ═══════════════════════════════════════════
export interface BookingState {
  step: "draft" | "slots" | "confirm" | "done";
  missingFields: string[];
  alexPrompt: string;
  canProceed: boolean;
}

export function evaluateBookingState(booking: {
  hasContractor?: boolean;
  hasDate?: boolean;
  hasTime?: boolean;
  hasContact?: boolean;
  isConfirmed?: boolean;
}): BookingState {
  const missing: string[] = [];
  if (!booking.hasContractor) missing.push("contractor");
  if (!booking.hasDate) missing.push("date");
  if (!booking.hasTime) missing.push("time");
  if (!booking.hasContact) missing.push("contact");

  if (booking.isConfirmed) {
    return { step: "done", missingFields: [], alexPrompt: "Ton rendez-vous est confirmé. Tu recevras un rappel.", canProceed: true };
  }
  if (missing.length === 0) {
    return { step: "confirm", missingFields: [], alexPrompt: "Tout est prêt. On confirme ?", canProceed: true };
  }
  if (booking.hasContractor && booking.hasDate) {
    return { step: "slots", missingFields: missing, alexPrompt: "Il reste à choisir l'heure. Voici les disponibilités.", canProceed: false };
  }
  return { step: "draft", missingFields: missing, alexPrompt: "On prépare ton rendez-vous. " + (missing.includes("contractor") ? "Quel type d'expert tu cherches ?" : "Quelle date te convient ?"), canProceed: false };
}

// ─── Booking Recovery ───
export function detectIncompleteBooking(booking: {
  createdAt: string;
  step: string;
  isConfirmed: boolean;
}): { shouldRecover: boolean; alexText: string } {
  if (booking.isConfirmed) return { shouldRecover: false, alexText: "" };

  const age = Date.now() - new Date(booking.createdAt).getTime();
  const hours = age / (1000 * 60 * 60);

  if (hours > 24) {
    return { shouldRecover: true, alexText: "Tu avais commencé un rendez-vous hier. On le reprend ?" };
  }
  if (hours > 1) {
    return { shouldRecover: true, alexText: "Tu as un rendez-vous en cours. On le finalise ?" };
  }
  return { shouldRecover: false, alexText: "" };
}

// ═══════════════════════════════════════════
// GROWTH ENGINE
// ═══════════════════════════════════════════
export interface GrowthSuggestion {
  type: "upsell" | "cross_sell" | "upgrade";
  label: string;
  alexText: string;
  targetAction: string;
  priority: number;
}

export function getGrowthSuggestions(context: {
  role: string;
  currentPlan?: string;
  aippScore?: number;
  hasBookedBefore?: boolean;
  serviceCount?: number;
}): GrowthSuggestion[] {
  const suggestions: GrowthSuggestion[] = [];

  if (context.role === "contractor") {
    // Plan upgrade
    if (context.currentPlan === "recrue" || context.currentPlan === "pro") {
      suggestions.push({
        type: "upgrade",
        label: "Passer au plan supérieur",
        alexText: "Ton volume justifie un plan supérieur. Tu veux voir la différence ?",
        targetAction: "show_plan",
        priority: 1,
      });
    }
    // AIPP improvement
    if (context.aippScore && context.aippScore < 60) {
      suggestions.push({
        type: "upsell",
        label: "Améliorer le score AIPP",
        alexText: "Ton score AIPP peut monter avec quelques ajustements. Je te montre ?",
        targetAction: "show_score",
        priority: 2,
      });
    }
  }

  if (context.role === "homeowner" && context.hasBookedBefore) {
    suggestions.push({
      type: "cross_sell",
      label: "Autre service",
      alexText: "Puisque tu as déjà fait appel à un expert, tu veux vérifier un autre aspect de ta propriété ?",
      targetAction: "navigate",
      priority: 3,
    });
  }

  return suggestions.sort((a, b) => a.priority - b.priority);
}
