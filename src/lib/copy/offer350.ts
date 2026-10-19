/** 
 * Offre de base pour les NOUVEAUX entrepreneurs UNPRO.
 * Paiement unique 350 $ avant taxes applicables.
 * Profil + 12 mois de présence IA sur UNPRO à compter du paiement confirmé.
 * Aucun rendez-vous inclus dans cette activation de base. Les droits historiques
 * et les ententes personnalisées sont déterminés séparément côté serveur.
 * Cette copie ne constitue jamais une garantie de référencement externe.
 */
export const OFFER_350 = {
  price_cents: 35000,
  price_label: "350 $",
  max_appointments: 0,
  duration_months: 12,
  duration_label: "12 mois",
  title: "Activez votre présence IA sur UNPRO pendant 12 mois",
  subtitle: "Créez votre profil d'entrepreneur et définissez les services, territoires et projets qui vous conviennent.",
  ctaPrimary: "Activer mon profil — 350 $ + taxes",
  ctaCalculate: "Découvrir les options de rendez-vous",
  ctaActivate: "Activer mon profil — 350 $ + taxes",
  disclaimer: "Aucun rendez-vous inclus dans l'activation de base. Toute offre de rendez-vous additionnels est distincte et précisée avant paiement.",
  paymentNote: "Paiement unique. Aucun abonnement ni renouvellement automatique.",

  card: {
    eyebrow: "Activation unique · 350 $ + taxes applicables",
    title: "Votre profil UNPRO et 12 mois de présence IA",
    bullets: [
      "Profil entrepreneur sur UNPRO",
      "12 mois de présence IA sur UNPRO après paiement confirmé",
      "Services et territoires définis selon vos préférences",
      "Rendez-vous additionnels uniquement par entente distincte",
      "Aucune promesse de visibilité sur une IA externe",
    ],
  },

  resultTitle: "Votre activation UNPRO",
  resultMaxLabel: "Rendez-vous inclus dans l'offre de base",
  resultMaxValue: "0",
  resultGuaranteeLabel: "Rendez-vous additionnels",
  analysisRequired: "Une proposition distincte est nécessaire.",
  analysisRequiredHelp: "Un volume de rendez-vous exclusifs peut être proposé séparément, selon votre métier, votre territoire et la capacité vérifiée.",
  claraBeforeCalculation:
    "L'activation de 350 $ plus taxes comprend votre profil et 12 mois de présence IA sur UNPRO. Aucun rendez-vous n'est inclus dans cette offre de base.",
  claraAfterCalculation: (appts: number, priceLabel: string, duration: string) =>
    appts > 0
      ? `Une proposition distincte pourrait comprendre ${appts} rendez-vous exclusifs pour ${priceLabel} sur ${duration}, sous réserve des conditions confirmées avant paiement.`
      : "Aucun rendez-vous n'est inclus dans l'activation de base de 350 $ plus taxes.",
} as const;

export function guaranteeSentence(appointments: number): string {
  if (appointments <= 0) return "Aucun rendez-vous inclus dans l'activation de base.";
  return `${appointments} rendez-vous exclusif${appointments > 1 ? "s" : ""} uniquement si une entente distincte et un droit serveur les confirment.`;
}

/**
 * Activation d'entrée 350 $ — paiement unique pour un nouvel entrepreneur.
 * « 588 $ » = 12 × 49 $ (prix mensuel Présence du catalogue). Le nombre de
 * rendez-vous n'est affiché que s'il est garanti par le devis serveur.
 */
export const ENTRY_350 = {
  eyebrow: "Nouvel entrepreneur · Paiement unique",
  title: "Activer mon profil — 350 $",
  cta: "Activer mon profil — 350 $ + taxes",
  ctaMore: "J'aimerais plus de rendez-vous dès maintenant",
  profile: "Votre profil entrepreneur UNPRO",
  presence: "12 mois de Présence IA (valeur de 588 $, soit 12 × 49 $)",
  appointments: (n: number) =>
    `${n} rendez-vous qualifié${n > 1 ? "s" : ""} exclusif${n > 1 ? "s" : ""}, jamais partagé${n > 1 ? "s" : ""}`,
  appointmentsPending:
    "Aucun rendez-vous inclus dans l'activation de base. Tout nombre de rendez-vous additionnels sera confirmé après l'analyse dans une entente distincte, avant paiement.",
  paymentNote: "Paiement unique de 350 $ + TPS (5 %) et TVQ (9,975 %), soit 402,41 $. Aucun abonnement. Activation dès la confirmation du paiement par Stripe.",
  errorRetry: "Le paiement n'a pas pu démarrer. Rien n'a été facturé. Vous pouvez réessayer.",
} as const;
