/**
 * UNPRO — Offre d'entrée 350 $ (paiement unique).
 *
 * SOURCE UNIQUE de la formulation publique. Avant calcul, l'offre est toujours
 * annoncée « jusqu'à 5 ». Après calcul, seul le nombre réellement garanti par
 * le moteur est affiché — jamais le maximum public.
 *
 * Interdit : « 5 rendez-vous pour 350 $ » (promesse non calculée).
 */

export const OFFER_350 = {
  price_cents: 35000,
  price_label: "350 $",
  max_appointments: 5,
  duration_months: 6,
  duration_label: "jusqu'à 6 mois",

  /** Avant calcul — annonce publique */
  title: "Jusqu'à 5 rendez-vous exclusifs garantis dès 350 $",
  subtitle:
    "Le nombre de rendez-vous que nous pouvons garantir dépend de votre domaine, de votre territoire et de la capacité disponible.",
  ctaPrimary: "Voir ce que 350 $ peut me garantir",
  ctaCalculate: "Calculer ma garantie",
  ctaActivate: "Activer ma garantie — 350 $",
  disclaimer:
    "Le nombre réel varie selon votre domaine, votre territoire et la capacité disponible.",
  paymentNote: "Paiement unique. Aucun abonnement.",

  card: {
    eyebrow: "À partir de 350 $",
    title: "Jusqu'à 5 rendez-vous exclusifs garantis",
    bullets: [
      "Rendez-vous exclusifs, jamais partagés",
      "Selon vos critères de projet",
      "Territoire défini avec vous",
      "Durée de livraison déterminée",
      "Garantie calculée avant le paiement",
    ],
  },

  /** Après calcul — vérité contractuelle */
  resultTitle: "Votre offre UNPRO",
  resultMaxLabel: "Maximum public",
  resultMaxValue: "jusqu'à 5",
  resultGuaranteeLabel: "Garantie contractuelle calculée",
  analysisRequired: "Analyse du territoire requise",
  analysisRequiredHelp:
    "Nous n'avons pas encore assez de signaux vérifiés sur ce territoire pour garantir un nombre de rendez-vous. Notre équipe complète l'analyse avant toute promesse.",

  /** Alex — avant / après calcul */
  alexBeforeCalculation:
    "Les forfaits commencent à 350 $ et peuvent inclure jusqu'à 5 rendez-vous exclusifs garantis, selon votre domaine et votre territoire.",
  alexAfterCalculation: (appts: number, priceLabel: string, duration: string) =>
    `Selon votre domaine, votre territoire et la capacité actuellement disponible, UNPRO peut vous garantir ${appts} rendez-vous exclusifs pour ${priceLabel} sur une période maximale de ${duration}.`,
} as const;

export function guaranteeSentence(appointments: number): string {
  if (appointments <= 0) return OFFER_350.analysisRequired;
  return `${appointments} rendez-vous exclusif${appointments > 1 ? "s" : ""} garanti${appointments > 1 ? "s" : ""}`;
}
