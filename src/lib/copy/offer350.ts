/**
 * UNPRO — Présence IA UNPRO — Lancement 350 $ + taxes, paiement unique (profil + 12 mois).
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
    "350 $ + taxes, paiement unique : votre profil entrepreneur et 12 mois de Présence IA sur UNPRO. Aucun rendez-vous inclus par défaut.",
  ctaPrimary: "Activer mon profil — 350 $ + taxes",
  ctaCalculate: "Voir mon activation",
  ctaActivate: "Activer mon profil — 350 $ + taxes",
  disclaimer:
    "Aucun rendez-vous ni résultat n'est promis. Des rendez-vous ne sont offerts que si un devis les confirme avant le paiement.",
  paymentNote: "350 $ CA avant taxes, paiement unique. Si les taxes du Québec s'appliquent : TPS 17,50 $ + TVQ 34,91 $ = 402,41 $ CA. Couvre 12 mois; aucun abonnement ni renouvellement automatique.",

  card: {
    eyebrow: "Présence IA — Lancement · 350 $",
    title: "Profil + 12 mois de Présence IA sur UNPRO",
    bullets: [
      "Profil entrepreneur UNPRO",
      "12 mois de Présence IA sur UNPRO",
      "Aucun rendez-vous inclus par défaut",
      "Publication après vérification (RBQ si requise)",
      "350 $ + taxes, paiement unique, sans abonnement automatique",
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
    "La Présence IA — Lancement coûte 350 $ plus taxes, en paiement unique : votre profil et 12 mois de Présence IA sur UNPRO. Aucun rendez-vous n'est inclus par défaut.",
  alexAfterCalculation: (appts: number, priceLabel: string, duration: string) =>
    `Votre devis confirme ${appts} rendez-vous exclusifs pour ${priceLabel}, sur ${duration}. Ce volume est distinct de l'activation 350 $.`,
} as const;

export function guaranteeSentence(appointments: number): string {
  if (appointments <= 0) return OFFER_350.analysisRequired;
  return `${appointments} rendez-vous exclusif${appointments > 1 ? "s" : ""} garanti${appointments > 1 ? "s" : ""}`;
}

/**
 * Présence IA 350 $ + taxes, paiement unique (profil + 12 mois) pour un nouvel entrepreneur.
 * Le nombre de rendez-vous n'est affiché que s'il est confirmé par le devis
 * contractuel serveur avant le paiement; les droits historiques sont conservés.
 */
export const ENTRY_350 = {
  eyebrow: "Présence IA — Lancement · 350 $",
  title: "Activer mon profil — 350 $ + taxes",
  cta: "Activer mon profil — 350 $ + taxes",
  ctaMore: "J'aimerais plus de rendez-vous dès maintenant",
  profile: "Votre profil entrepreneur UNPRO",
  presence: "12 mois de Présence IA sur UNPRO",
  appointments: (n: number) =>
    `${n} rendez-vous qualifié${n > 1 ? "s" : ""} exclusif${n > 1 ? "s" : ""}, jamais partagé${n > 1 ? "s" : ""}`,
  appointmentsPending:
    "Aucun rendez-vous inclus, sauf droit contractuel calculé et confirmé avant le paiement.",
  paymentNote: "350 $ CA avant taxes, paiement unique. Si les taxes du Québec s'appliquent : TPS 17,50 $ + TVQ 34,91 $ = 402,41 $ CA. Couvre 12 mois; aucun abonnement ni renouvellement automatique.",
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
    price: "350 $ + taxes · 12 mois",
    appointments: "Rendez-vous : offerts selon un devis distinct, avec prix et volume affichés avant paiement. Aucun n'est inclus dans l'activation.",
    promoToggle: "J'ai un code promo",
    returnPending: "Confirmation de votre activation en cours",
    returnPendingHelp: "Votre profil s'active dès que le paiement nous est confirmé. Inutile de payer à nouveau.",
    returnLink: "Voir mon espace entrepreneur",
  },
  /** Libellé exact approuvé (2026-11-18) pour les deux offres de Présence IA. */
  paymentLabel: "Paiement unique · sans abonnement automatique · taxes en sus",
  fallback: {
    title: "Pas encore prêt pour un forfait de rendez-vous? Commencez par votre Présence IA.",
    body: "Commencez à bâtir votre présence dès aujourd’hui. Un profil complet, tenu à jour, aide UNPRO à comprendre votre entreprise et à vous présenter pour les projets adaptés. Ajoutez des rendez-vous lorsque vous êtes prêt.",
    cta: "Commencer ma Présence IA — 350 $ + taxes",
    benefits: [
      "Profil entrepreneur UNPRO + 12 mois de Présence IA",
      "Vos services, territoires, spécialités et préférences structurés, utilisés par Clara lorsque votre admissibilité est confirmée",
      "Enrichissement de votre profil au fil de vos réponses",
      "Un forfait de rendez-vous peut s'ajouter plus tard, sans deuxième activation pendant la période valide",
    ],
  },
} as const;

/**
 * Option secondaire « Présence IA — Fondateur » (décision 2026-11-18) : 1 995 $ + taxes,
 * paiement unique, 120 mois. Mêmes prestations de Présence IA que l'offre Lancement;
 * aucun rendez-vous, priorité, exclusivité territoriale ni volume. Distincte de
 * l'offre Fondateur gratuite /fondateurs et des anciens produits Fondateur Stripe.
 */
export const PRESENCE_FOUNDER = {
  toggle: "Voir l'option Fondateur — 10 ans",
  name: "Présence IA — Fondateur",
  title: "Votre profil entreprise + 120 mois de Présence IA UNPRO",
  price: "1 995 $ + taxes · 120 mois (10 ans)",
  taxes: "Si les taxes du Québec s'appliquent : 1 995,00 $ + TPS 99,75 $ + TVQ 199,00 $ = 2 293,75 $ CA, payés une fois.",
  scope: [
    "Les mêmes prestations que l'offre Lancement : profil entrepreneur UNPRO et Présence IA sur UNPRO",
    "Durée : 120 mois à compter de la confirmation du paiement par UNPRO",
    "Aucun rendez-vous, aucune priorité, aucune exclusivité territoriale et aucun volume inclus",
  ],
  availability:
    "UNPRO met votre profil et votre Présence IA à disposition sur UNPRO pendant la durée, tant que votre entreprise respecte les conditions d'admissibilité (licence RBQ active lorsque requise). La publication suit la vérification. Les recommandations faites par des IA externes (ChatGPT ou autres) ne sont jamais garanties.",
  illustration:
    "Exemple indicatif : à 50 $ par mois, 12 mois = 600 $ et 120 mois = 6 000 $. Illustration arithmétique, pas un ancien prix UNPRO.",
  consent:
    "J'ai lu ces modalités : paiement unique de 1 995 $ + taxes pour 120 mois de Présence IA sur UNPRO, sans rendez-vous inclus ni abonnement automatique.",
  backToLaunch: "Revenir à l'offre Lancement — 350 $",
} as const;
