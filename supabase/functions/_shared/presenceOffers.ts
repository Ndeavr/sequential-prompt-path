/**
 * UNPRO — Offres de Présence IA (décision fondateur 2026-11-18).
 * Source serveur unique des montants, taxes et durées. Paiement unique,
 * aucun abonnement. Le client ne choisit qu'un identifiant d'offre; le
 * montant n'est jamais lu depuis le client. Pur : importable par Deno et Vite.
 */
export type PresenceTier = "launch_12m" | "founder_120m";

export interface PresenceOffer {
  tier: PresenceTier;
  subtotal: number; gst: number; qst: number; tax: number; total: number;
  months: 12 | 120;
  taxContract: string;
  stripeName: string;
  stripeDescription: string;
  stripeSubmit: string;
}

export const PRESENCE_OFFERS: Record<PresenceTier, PresenceOffer> = {
  launch_12m: {
    tier: "launch_12m", subtotal: 35000, gst: 1750, qst: 3491, tax: 5241, total: 40241, months: 12,
    taxContract: "qc-exclusive-v1",
    stripeName: "Présence IA — Lancement",
    stripeDescription: "Profil entrepreneur UNPRO + 12 mois de Présence IA UNPRO. Paiement unique, aucun abonnement.",
    stripeSubmit: "350 $ CA avant taxes. TPS : 17,50 $; TVQ : 34,91 $; total : 402,41 $ CA. Paiement unique, aucun abonnement.",
  },
  founder_120m: {
    // 199500 × 5 % = 9975; 199500 × 9,975 % = 19900,0125 → 19900 (arrondi Stripe par taux).
    tier: "founder_120m", subtotal: 199500, gst: 9975, qst: 19900, tax: 29875, total: 229375, months: 120,
    taxContract: "qc-exclusive-founder120-v1",
    stripeName: "Présence IA — Fondateur (10 ans)",
    stripeDescription: "Profil entrepreneur UNPRO + 120 mois de Présence IA UNPRO. Paiement unique, aucun abonnement. Aucun rendez-vous, priorité ni exclusivité inclus.",
    stripeSubmit: "1 995 $ CA avant taxes. TPS : 99,75 $; TVQ : 199,00 $; total : 2 293,75 $ CA. Paiement unique, aucun abonnement.",
  },
};

/** Absent → offre Lancement (comportement historique); identifiant inconnu → null (refus). */
export function resolvePresenceTier(input: unknown): PresenceTier | null {
  if (input === undefined || input === null || input === "" || input === "launch_12m") return "launch_12m";
  if (input === "founder_120m") return "founder_120m";
  return null;
}

/** Offre attestée par une session Stripe signée : contrat fiscal + palier + montant concordants. */
export function presenceTierFromSession(s: {
  amount_subtotal?: number | null; metadata?: Record<string, unknown> | null;
}): PresenceTier | null {
  const md = s.metadata ?? {};
  if (md.presence_tier === "founder_120m") {
    const f = PRESENCE_OFFERS.founder_120m;
    return md.entry_tax_contract === f.taxContract && s.amount_subtotal === f.subtotal && md.presence_ia_months === "120"
      ? "founder_120m" : null;
  }
  if (md.presence_tier !== undefined && md.presence_tier !== null && md.presence_tier !== "launch_12m") return null;
  if (md.entry_tax_contract === PRESENCE_OFFERS.founder_120m.taxContract) return null;
  return s.amount_subtotal === PRESENCE_OFFERS.launch_12m.subtotal ? "launch_12m" : null;
}

export function presenceOfferByTaxContract(contract: unknown): PresenceOffer | null {
  return Object.values(PRESENCE_OFFERS).find((o) => o.taxContract === contract) ?? null;
}

/** Durée d'un droit consigné; tout autre contenu retombe sur 12 mois (jamais plus). */
export function presenceMonthsFromLedger(md: Record<string, unknown> | null | undefined): 12 | 120 {
  return md?.presence_tier === "founder_120m" && md?.presence_months === "120" ? 120 : 12;
}
