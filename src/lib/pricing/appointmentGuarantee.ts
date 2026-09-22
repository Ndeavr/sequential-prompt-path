/**
 * UNPRO — Promesse de rendez-vous : SOURCE UNIQUE DE VÉRITÉ.
 *
 * Règle commerciale canonique :
 * - la cadence mensuelle est INDICATIVE (« jusqu'à X par mois ») ;
 * - l'engagement est ANNUEL (X × 12 rendez-vous qualifiés sur 12 mois) ;
 * - la distribution varie selon la saison, le territoire, le métier et la demande.
 *
 * Aucun écran ne doit réécrire ces phrases ni recalculer la garantie.
 * Aucun chiffre n'est inventé : sans donnée fiable, on retourne `status: "unknown"`.
 */

export const GUARANTEE_MONTHS = 12;

export interface AppointmentGuarantee {
  status: "known" | "unknown";
  /** Cadence mensuelle indicative issue des données réelles du plan. */
  monthlyCadence: number | null;
  /** Engagement contractuel sur 12 mois. */
  annualGuarantee: number | null;
  /** « Jusqu'à 5 rendez-vous par mois » */
  cadenceLabel: string;
  /** « 60 rendez-vous qualifiés garantis sur 12 mois » */
  guaranteeLabel: string;
  /** Libellé court pour le checkout : garantie annuelle en principal. */
  checkoutPrimaryLabel: string;
  checkoutSecondaryLabel: string;
  /** Explication de la saisonnalité. */
  seasonalityNote: string;
}

export const SEASONALITY_NOTE =
  "La garantie est calculée sur une base annuelle. La distribution des rendez-vous peut varier selon la saison, votre territoire et la demande réelle. Certains mois peuvent donc générer davantage de rendez-vous et d'autres moins.";

const UNKNOWN_CADENCE_LABEL = "Cadence de rendez-vous à confirmer";
const UNKNOWN_GUARANTEE_LABEL = "Garantie annuelle à confirmer";

/**
 * Construit la promesse à partir de la cadence mensuelle réelle du plan
 * (`plans.appointments_included` ou `contractor_pricing_quotes.guaranteed_appointments`).
 */
export function buildAppointmentGuarantee(
  monthlyCadence: number | null | undefined,
): AppointmentGuarantee {
  const cadence =
    typeof monthlyCadence === "number" && Number.isFinite(monthlyCadence) && monthlyCadence > 0
      ? Math.round(monthlyCadence)
      : null;

  if (cadence === null) {
    return {
      status: "unknown",
      monthlyCadence: null,
      annualGuarantee: null,
      cadenceLabel: UNKNOWN_CADENCE_LABEL,
      guaranteeLabel: UNKNOWN_GUARANTEE_LABEL,
      checkoutPrimaryLabel: UNKNOWN_GUARANTEE_LABEL,
      checkoutSecondaryLabel: UNKNOWN_CADENCE_LABEL,
      seasonalityNote: SEASONALITY_NOTE,
    };
  }

  const annual = cadence * GUARANTEE_MONTHS;

  return {
    status: "known",
    monthlyCadence: cadence,
    annualGuarantee: annual,
    cadenceLabel: `Jusqu'à ${cadence} rendez-vous par mois`,
    guaranteeLabel: `${annual} rendez-vous qualifiés garantis sur 12 mois`,
    checkoutPrimaryLabel: `${annual} rendez-vous garantis / 12 mois`,
    checkoutSecondaryLabel: `cadence pouvant aller jusqu'à ${cadence}/mois selon la demande`,
    seasonalityNote: SEASONALITY_NOTE,
  };
}

/**
 * Réponse canonique à l'objection « je peux acheter des leads à ~35 $ ».
 * Les chiffres viennent toujours du plan réel : sans plan connu, aucun nombre n'est cité.
 */
export function buildPriceObjectionCopy(
  guarantee: AppointmentGuarantee,
): string {
  const base = [
    "Oui, vous pouvez trouver des leads autour de 35 $, mais ce sont souvent des leads partagés. Plusieurs entrepreneurs reçoivent le même client et vous devez ensuite le joindre, le relancer et compétitionner pour obtenir le projet.",
    "UNPRO fonctionne différemment. L'objectif est de vous présenter un client déjà qualifié pour votre type de service, votre territoire et son projet, avec une réelle intention d'avancer.",
    "Vous ne payez donc pas pour un nom et un numéro de téléphone, mais pour un rendez-vous exclusif, préqualifié et beaucoup plus près d'une décision.",
  ];

  if (guarantee.status === "known") {
    base.push(
      `Et la garantie est calculée sur l'année : une cadence de ${guarantee.monthlyCadence} rendez-vous par mois correspond à ${guarantee.annualGuarantee} rendez-vous garantis sur 12 mois. Certains mois sont plus forts, d'autres plus tranquilles selon la saison et la demande.`,
    );
  } else {
    base.push(
      "Et la garantie est calculée sur l'année, pas comme un quota fixe chaque mois. Le nombre exact est établi avec vous à partir de votre métier, de votre territoire et de votre capacité réelle.",
    );
  }

  return base.join("\n\n");
}
