// PROTECTED — UNPRO autonomous contractor onboarding SMS sequence.
// 4 steps, 24h cadence. Stop after step 4 unless reply or paid.

export type OnboardingStep = {
  step: number;
  delay_hours: number;
  body: (vars: { business_name: string; private_profile_url: string }) => string;
};

const fallbackName = (n?: string | null) => (n && n.trim().length > 0 ? n.trim() : "votre entreprise");

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    step: 1,
    delay_hours: 0,
    body: ({ business_name, private_profile_url }) =>
      `Bonjour ${fallbackName(business_name)}, voulez-vous que votre entreprise soit recommandée par l'IA pour des clients résidentiels qualifiés? UNPRO active des rendez-vous exclusifs, pas des leads partagés. Voir votre profil: ${private_profile_url}`,
  },
  {
    step: 2,
    delay_hours: 24,
    body: ({ private_profile_url }) =>
      `Votre profil UNPRO est prêt à être activé. L'objectif: vous recommander aux bons propriétaires selon vos services, secteurs et disponibilités. Activation ici: ${private_profile_url}`,
  },
  {
    step: 3,
    delay_hours: 24,
    body: ({ private_profile_url }) =>
      `Les entreprises qui laissent de bonnes traces structurées plus tôt seront plus faciles à recommander par l'IA. Votre profil peut être activé ici: ${private_profile_url}`,
  },
  {
    step: 4,
    delay_hours: 24,
    body: ({ private_profile_url }) =>
      `Dernier suivi UNPRO: voulez-vous recevoir des rendez-vous exclusifs garantis dans votre secteur? Activez votre profil ou répondez STOP pour arrêter: ${private_profile_url}`,
  },
];

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

export function buildPrivateProfileUrl(token: string | null | undefined, leadId: string): string {
  const base = "https://app.unpro.ca/pro";
  const t = token ?? leadId;
  return `${base}/${leadId}?t=${t}`;
}
