/**
 * UNPRO — Offre d'entrée 350 $ (paiement unique).
 *
 * SOURCE UNIQUE de la formulation publique : profil + 12 mois de Présence IA
 * sur UNPRO, 0 rendez-vous inclus par défaut, aucune visibilité IA externe promise.
 */

export const OFFER_350 = {
  price_cents: 35000,
  price_label: "350 $",
  /** Aucun rendez-vous inclus par défaut; seul un devis serveur peut en garantir. */
  max_appointments: 0,
  duration_months: 12,
  duration_label: "12 mois",

  title: "Activer mon profil UNPRO — 350 $ + taxes",
  subtitle:
    "Paiement unique : votre profil entrepreneur et 12 mois de Présence IA sur UNPRO. Aucun rendez-vous inclus par défaut.",
  ctaPrimary: "Activer mon profil — 350 $ + taxes",
  ctaCalculate: "Voir mon activation",
  ctaActivate: "Activer mon profil — 350 $ + taxes",
  disclaimer:
    "Aucun rendez-vous ni résultat n'est promis. Des rendez-vous ne sont offerts que si un devis les confirme avant le paiement.",
  paymentNote: "350 $ CA avant taxes. Si les taxes du Québec s'appliquent : TPS 17,50 $ + TVQ 34,91 $ = 402,41 $ CA. Paiement unique. Aucun abonnement.",

  card: {
    eyebrow: "Nouvel entrepreneur · Paiement unique",
    title: "Profil + 12 mois de Présence IA sur UNPRO",
    bullets: [
      "Profil entrepreneur UNPRO",
      "12 mois de Présence IA sur UNPRO",
      "Aucun rendez-vous inclus par défaut",
      "Publication après vérification (RBQ si requise)",
      "Paiement unique, aucun abonnement",
    ],
  },

  resultTitle: "Votre offre UNPRO",
  resultMaxLabel: "Rendez-vous inclus",
  resultMaxValue: "aucun par défaut",
  resultGuaranteeLabel: "Rendez-vous confirmés par votre devis",
  analysisRequired: "Aucun rendez-vous inclus",
  analysisRequiredHelp:
    "L'activation 350 $ n'inclut aucun rendez-vous. Si vous en voulez, UNPRO calcule un devis séparé, avec prix et volume explicites avant tout paiement.",

  alexBeforeCalculation:
    "L'activation coûte 350 $ plus taxes, une seule fois : votre profil et 12 mois de Présence IA sur UNPRO. Aucun rendez-vous n'est inclus par défaut.",
  alexAfterCalculation: (appts: number, priceLabel: string, duration: string) =>
    `Votre devis confirme ${appts} rendez-vous exclusifs pour ${priceLabel}, sur ${duration}. Ce volume est distinct de l'activation 350 $.`,
} as const;

export function guaranteeSentence(appointments: number): string {
  if (appointments <= 0) return OFFER_350.analysisRequired;
  return `${appointments} rendez-vous exclusif${appointments > 1 ? "s" : ""} garanti${appointments > 1 ? "s" : ""}`;
}

/**
 * Activation d'entrée 350 $ — paiement unique pour un nouvel entrepreneur.
 * Le nombre de rendez-vous n'est affiché que s'il est confirmé par le devis
 * contractuel serveur avant le paiement; les droits historiques sont conservés.
 */
export const ENTRY_350 = {
  eyebrow: "Nouvel entrepreneur · Paiement unique",
  title: "Activer mon profil — 350 $",
  cta: "Activer mon profil — 350 $ + taxes",
  ctaMore: "J'aimerais plus de rendez-vous dès maintenant",
  profile: "Votre profil entrepreneur UNPRO",
  presence: "12 mois de Présence IA sur UNPRO",
  appointments: (n: number) =>
    `${n} rendez-vous qualifié${n > 1 ? "s" : ""} exclusif${n > 1 ? "s" : ""}, jamais partagé${n > 1 ? "s" : ""}`,
  appointmentsPending:
    "Aucun rendez-vous inclus, sauf droit contractuel calculé et confirmé avant le paiement.",
  paymentNote: "350 $ CA avant taxes. Si les taxes du Québec s'appliquent : TPS 17,50 $ + TVQ 34,91 $ = 402,41 $ CA. Paiement unique, aucun abonnement.",
  errorRetry: "Le paiement n'a pas pu démarrer. Rien n'a été facturé. Vous pouvez réessayer.",
} as const;
