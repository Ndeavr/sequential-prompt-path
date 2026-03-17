/**
 * UNPRO — Sales Psychology Engine
 * Maximizes conversion through microcopy, trust, urgency, and decision accelerators.
 */

export type PsychologyPrinciple =
  | "urgency"
  | "scarcity"
  | "social_proof"
  | "authority"
  | "loss_aversion"
  | "simplicity";

export type Audience = "homeowner" | "contractor" | "both";
export type Placement = "hero" | "card" | "modal" | "button" | "tooltip" | "banner" | "badge";
export type CopyContext =
  | "homeowner_cta"
  | "contractor_cta"
  | "trust_badge"
  | "urgency"
  | "scarcity"
  | "social_proof"
  | "authority"
  | "fear_reduction"
  | "decision_accelerator";

export interface Microcopy {
  id: string;
  context: CopyContext;
  placement: Placement;
  audience: Audience;
  text_fr: string;
  text_en?: string;
  psychology_principle: PsychologyPrinciple;
  priority: number;
  conversion_rate?: number;
}

// Built-in high-impact microcopy library
export const MICROCOPY_LIBRARY: Omit<Microcopy, "id">[] = [
  // --- Homeowner urgency ---
  { context: "urgency", placement: "banner", audience: "homeowner", text_fr: "⏰ 3 entrepreneurs disponibles dans votre secteur — réservez maintenant", psychology_principle: "urgency", priority: 100 },
  { context: "urgency", placement: "card", audience: "homeowner", text_fr: "Ce professionnel est très demandé — prochaine disponibilité limitée", psychology_principle: "urgency", priority: 90 },

  // --- Homeowner scarcity ---
  { context: "scarcity", placement: "badge", audience: "homeowner", text_fr: "🔒 Rendez-vous garanti, non partagé", psychology_principle: "scarcity", priority: 100 },
  { context: "scarcity", placement: "card", audience: "homeowner", text_fr: "Exclusif — un seul entrepreneur reçoit votre demande", psychology_principle: "scarcity", priority: 95 },

  // --- Homeowner social proof ---
  { context: "social_proof", placement: "hero", audience: "homeowner", text_fr: "Rejoint par 2 400+ propriétaires au Québec", psychology_principle: "social_proof", priority: 85 },
  { context: "social_proof", placement: "card", audience: "homeowner", text_fr: "98% de satisfaction sur les rendez-vous UNPRO", psychology_principle: "social_proof", priority: 80 },

  // --- Homeowner loss aversion ---
  { context: "homeowner_cta", placement: "hero", audience: "homeowner", text_fr: "Arrêtez de demander 3 soumissions — trouvez le bon entrepreneur dès maintenant", psychology_principle: "loss_aversion", priority: 100 },
  { context: "homeowner_cta", placement: "modal", audience: "homeowner", text_fr: "3 soumissions = perte de temps. UNPRO fait le tri pour vous.", psychology_principle: "loss_aversion", priority: 95 },

  // --- Homeowner trust / fear reduction ---
  { context: "fear_reduction", placement: "badge", audience: "homeowner", text_fr: "✅ Entrepreneur vérifié par UNPRO", psychology_principle: "authority", priority: 100 },
  { context: "fear_reduction", placement: "tooltip", audience: "homeowner", text_fr: "Crédit automatique si le rendez-vous ne correspond pas à vos besoins", psychology_principle: "simplicity", priority: 90 },
  { context: "trust_badge", placement: "card", audience: "homeowner", text_fr: "Score d'autorité vérifié • Licence RBQ confirmée", psychology_principle: "authority", priority: 95 },

  // --- Contractor side ---
  { context: "contractor_cta", placement: "card", audience: "contractor", text_fr: "🎯 Projet parfaitement adapté à votre expertise", psychology_principle: "authority", priority: 100 },
  { context: "contractor_cta", placement: "banner", audience: "contractor", text_fr: "Valeur estimée du projet visible avant acceptation", psychology_principle: "simplicity", priority: 90 },
  { context: "scarcity", placement: "badge", audience: "contractor", text_fr: "🔥 2 projets restants aujourd'hui", psychology_principle: "scarcity", priority: 100 },
  { context: "scarcity", placement: "card", audience: "contractor", text_fr: "Exclusif — vous êtes le seul entrepreneur contacté", psychology_principle: "scarcity", priority: 95 },
  { context: "urgency", placement: "banner", audience: "contractor", text_fr: "⚡ Acceptez en 15 min pour garder l'exclusivité", psychology_principle: "urgency", priority: 100 },
  { context: "decision_accelerator", placement: "button", audience: "contractor", text_fr: "Accepter ce projet →", psychology_principle: "simplicity", priority: 100 },
  { context: "authority", placement: "badge", audience: "contractor", text_fr: "Score d'autorité: {score}/100 — Top {percentile}%", psychology_principle: "authority", priority: 85 },

  // --- Decision accelerators ---
  { context: "decision_accelerator", placement: "button", audience: "homeowner", text_fr: "Trouver mon entrepreneur →", psychology_principle: "simplicity", priority: 100 },
  { context: "decision_accelerator", placement: "modal", audience: "homeowner", text_fr: "En 30 secondes, décrivez votre projet", psychology_principle: "simplicity", priority: 90 },
];

// Get microcopy for a specific context
export function getMicrocopy(
  context: CopyContext,
  audience: Audience,
  placement?: Placement
): Omit<Microcopy, "id">[] {
  return MICROCOPY_LIBRARY
    .filter((m) =>
      m.context === context &&
      (m.audience === audience || m.audience === "both") &&
      (!placement || m.placement === placement)
    )
    .sort((a, b) => b.priority - a.priority);
}

// Get best single copy for a slot
export function getBestCopy(
  context: CopyContext,
  audience: Audience,
  placement?: Placement
): string {
  const copies = getMicrocopy(context, audience, placement);
  return copies[0]?.text_fr ?? "";
}

// Replace placeholders like {score}, {percentile}
export function interpolateCopy(text: string, vars: Record<string, string | number>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
}

// Trust badge generator
export function generateTrustBadges(contractor: {
  isVerified?: boolean;
  authorityScore?: number;
  hasLicense?: boolean;
  reviewCount?: number;
  conversionRate?: number;
}): Array<{ icon: string; label_fr: string; principle: PsychologyPrinciple }> {
  const badges: Array<{ icon: string; label_fr: string; principle: PsychologyPrinciple }> = [];

  if (contractor.isVerified) {
    badges.push({ icon: "✅", label_fr: "Vérifié UNPRO", principle: "authority" });
  }
  if (contractor.hasLicense) {
    badges.push({ icon: "📋", label_fr: "Licence RBQ confirmée", principle: "authority" });
  }
  if (contractor.authorityScore && contractor.authorityScore >= 80) {
    badges.push({ icon: "⭐", label_fr: `Score d'autorité: ${contractor.authorityScore}/100`, principle: "authority" });
  }
  if (contractor.reviewCount && contractor.reviewCount >= 10) {
    badges.push({ icon: "💬", label_fr: `${contractor.reviewCount} avis vérifiés`, principle: "social_proof" });
  }
  if (contractor.conversionRate && contractor.conversionRate >= 0.85) {
    badges.push({ icon: "🎯", label_fr: `${Math.round(contractor.conversionRate * 100)}% taux d'acceptation`, principle: "social_proof" });
  }

  return badges;
}
