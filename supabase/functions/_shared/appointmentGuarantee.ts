/**
 * UNPRO — Promesse de rendez-vous : SOURCE UNIQUE DE VÉRITÉ (côté serveur).
 * Miroir exact de src/lib/pricing/appointmentGuarantee.ts.
 *
 * Cadence mensuelle = indicative. Engagement = annuel (cadence × 12).
 * Aucun chiffre inventé : sans cadence fiable, status = "unknown".
 */

export const GUARANTEE_MONTHS = 12;

export const SEASONALITY_NOTE =
  "La garantie est calculée sur une base annuelle. La distribution des rendez-vous peut varier selon la saison, votre territoire et la demande réelle. Certains mois peuvent donc générer davantage de rendez-vous et d'autres moins.";

export interface AppointmentGuarantee {
  status: "known" | "unknown";
  monthlyCadence: number | null;
  annualGuarantee: number | null;
  cadenceLabel: string;
  guaranteeLabel: string;
  checkoutPrimaryLabel: string;
  checkoutSecondaryLabel: string;
  seasonalityNote: string;
}

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
      cadenceLabel: "Cadence de rendez-vous à confirmer",
      guaranteeLabel: "Garantie annuelle à confirmer",
      checkoutPrimaryLabel: "Garantie annuelle à confirmer",
      checkoutSecondaryLabel: "Cadence de rendez-vous à confirmer",
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

export function buildPriceObjectionCopy(guarantee: AppointmentGuarantee): string {
  const parts = [
    "Oui, vous pouvez trouver des leads autour de 35 $, mais ce sont souvent des leads partagés. Plusieurs entrepreneurs reçoivent le même client et vous devez ensuite le joindre, le relancer et compétitionner pour obtenir le projet.",
    "UNPRO fonctionne différemment. L'objectif est de vous présenter un client déjà qualifié pour votre type de service, votre territoire et son projet, avec une réelle intention d'avancer.",
    "Vous ne payez donc pas pour un nom et un numéro de téléphone, mais pour un rendez-vous exclusif, préqualifié et beaucoup plus près d'une décision.",
  ];
  parts.push(
    guarantee.status === "known"
      ? `Et la garantie est calculée sur l'année : une cadence de ${guarantee.monthlyCadence} rendez-vous par mois correspond à ${guarantee.annualGuarantee} rendez-vous garantis sur 12 mois. Certains mois sont plus forts, d'autres plus tranquilles selon la saison et la demande.`
      : "Et la garantie est calculée sur l'année, pas comme un quota fixe chaque mois. Le nombre exact est établi avec vous à partir de votre métier, de votre territoire et de votre capacité réelle.",
  );
  return parts.join("\n\n");
}

/** Bloc d'instructions injecté dans les prompts Clara (texte et voix). */
export function buildGuaranteePromptBlock(
  guarantee: AppointmentGuarantee,
): string {
  return [
    "## PROMESSE DE RENDEZ-VOUS (RÈGLE ABSOLUE)",
    "- La cadence mensuelle est INDICATIVE : « jusqu'à X rendez-vous par mois ».",
    "- L'engagement est ANNUEL : X × 12 rendez-vous qualifiés garantis sur 12 mois.",
    "- Ne jamais promettre « X rendez-vous garantis chaque mois ».",
    `- Saisonnalité à expliquer : ${SEASONALITY_NOTE}`,
    guarantee.status === "known"
      ? `- Chiffres du plan réellement affiché : ${guarantee.cadenceLabel} — ${guarantee.guaranteeLabel}.`
      : "- Aucune cadence confirmée pour ce dossier : ne cite AUCUN chiffre de rendez-vous. Dis que le nombre exact est calculé avant le paiement.",
    "",
    "## OBJECTION PRIX (leads partagés ~35 $)",
    buildPriceObjectionCopy(guarantee),
  ].join("\n");
}
