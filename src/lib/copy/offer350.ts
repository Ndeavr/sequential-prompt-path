/**
 * UNPRO — Présence IA UNPRO — 350 $ + taxes par année (profil + 12 mois).
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
    "350 $ + taxes par année : votre profil entrepreneur et 12 mois de Présence IA sur UNPRO. Aucun rendez-vous inclus par défaut.",
  ctaPrimary: "Activer mon profil — 350 $ + taxes",
  ctaCalculate: "Voir mon activation",
  ctaActivate: "Activer mon profil — 350 $ + taxes",
  disclaimer:
    "Aucun rendez-vous ni résultat n'est promis. Des rendez-vous ne sont offerts que si un devis les confirme avant le paiement.",
  paymentNote: "350 $ CA avant taxes, par année. Si les taxes du Québec s'appliquent : TPS 17,50 $ + TVQ 34,91 $ = 402,41 $ CA. Couvre 12 mois; renouvellement non automatique, aucun prélèvement sans votre accord.",

  card: {
    eyebrow: "Présence IA · 350 $ par année",
    title: "Profil + 12 mois de Présence IA sur UNPRO",
    bullets: [
      "Profil entrepreneur UNPRO",
      "12 mois de Présence IA sur UNPRO",
      "Aucun rendez-vous inclus par défaut",
      "Publication après vérification (RBQ si requise)",
      "350 $ + taxes par année, renouvellement non automatique",
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
    "La Présence IA coûte 350 $ plus taxes par année : votre profil et 12 mois de Présence IA sur UNPRO. Aucun rendez-vous n'est inclus par défaut.",
  alexAfterCalculation: (appts: number, priceLabel: string, duration: string) =>
    `Votre devis confirme ${appts} rendez-vous exclusifs pour ${priceLabel}, sur ${duration}. Ce volume est distinct de l'activation 350 $.`,
} as const;

export function guaranteeSentence(appointments: number): string {
  if (appointments <= 0) return OFFER_350.analysisRequired;
  return `${appointments} rendez-vous exclusif${appointments > 1 ? "s" : ""} garanti${appointments > 1 ? "s" : ""}`;
}

/**
 * Présence IA 350 $ + taxes par année (profil + 12 mois) pour un nouvel entrepreneur.
 * Le nombre de rendez-vous n'est affiché que s'il est confirmé par le devis
 * contractuel serveur avant le paiement; les droits historiques sont conservés.
 */
export const ENTRY_350 = {
  eyebrow: "Présence IA · 350 $ par année",
  title: "Activer mon profil — 350 $/an",
  cta: "Activer mon profil — 350 $ + taxes",
  ctaMore: "J'aimerais plus de rendez-vous dès maintenant",
  profile: "Votre profil entrepreneur UNPRO",
  presence: "12 mois de Présence IA sur UNPRO",
  appointments: (n: number) =>
    `${n} rendez-vous qualifié${n > 1 ? "s" : ""} exclusif${n > 1 ? "s" : ""}, jamais partagé${n > 1 ? "s" : ""}`,
  appointmentsPending:
    "Aucun rendez-vous inclus, sauf droit contractuel calculé et confirmé avant le paiement.",
  paymentNote: "350 $ CA avant taxes, par année. Si les taxes du Québec s'appliquent : TPS 17,50 $ + TVQ 34,91 $ = 402,41 $ CA. Couvre 12 mois; renouvellement non automatique.",
  errorRetry: "Le paiement n'a pas pu démarrer. Rien n'a été facturé. Vous pouvez réessayer.",
  /** Récapitulatif court avant paiement : bénéfices d'abord, prix et RDV ensuite, sans avalanche de réserves. */
  checkout: {
    eyebrow: "Votre activation UNPRO",
    title: "Votre profil entreprise + 12 mois de Présence IA UNPRO",
    benefits: [
      "Un profil entreprise UNPRO complet, tenu à jour",
      "Vos services, spécialités et territoire présentés aux propriétaires dont le projet correspond (licence vérifiée lorsque requise)",
      "12 mois de Présence IA sur UNPRO",
    ],
    price: "350 $ + taxes · par année",
    appointments: "Rendez-vous : offerts selon un devis distinct, avec prix et volume affichés avant paiement. Aucun n'est inclus dans l'activation.",
    promoToggle: "J'ai un code promo",
    returnPending: "Confirmation de votre activation en cours",
    returnPendingHelp: "Votre profil s'active dès que le paiement nous est confirmé. Inutile de payer à nouveau.",
    returnLink: "Voir mon espace entrepreneur",
  },
  fallback: {
    title: "Pas encore prêt pour un forfait de rendez-vous? Commencez par votre Présence IA.",
    body: "Commencez à bâtir votre présence dès aujourd’hui. Un profil complet, tenu à jour, aide UNPRO à comprendre votre entreprise et à vous présenter pour les projets adaptés. Ajoutez des rendez-vous lorsque vous êtes prêt.",
    cta: "Commencer ma Présence IA — 350 $/an",
    benefits: [
      "Profil entrepreneur UNPRO + 12 mois de Présence IA",
      "Vos services, territoires, spécialités et préférences structurés, utilisés par Clara lorsque votre admissibilité est confirmée",
      "Enrichissement de votre profil au fil de vos réponses",
      "Un forfait de rendez-vous peut s'ajouter plus tard, sans deuxième activation pendant la période valide",
    ],
  },
} as const;
