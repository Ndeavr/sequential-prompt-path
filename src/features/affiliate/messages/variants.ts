/**
 * Personal SMS variants for affiliate outreach.
 * The message builder handles missing data gracefully — never leaks {{placeholders}}.
 */
export type SmsVariantKey = "direct" | "warm" | "followup";

export interface SmsVariant {
  key: SmsVariantKey;
  label: string;
  description: string;
  template: string;
}

export const SMS_VARIANTS: SmsVariant[] = [
  {
    key: "direct",
    label: "Directe",
    description: "Courte, professionnelle.",
    template:
      "Bonjour {greeting}, ici {affiliate_first_name} avec UNPRO. Nous aidons {company_or_pros} à recevoir des rendez-vous exclusifs via l'IA. Essai 7 jours à 1 $: {link}",
  },
  {
    key: "warm",
    label: "Chaleureuse",
    description: "Personnalisée, locale.",
    template:
      "Bonjour {greeting}, ici {affiliate_first_name} avec UNPRO. J'ai vu {company_line}{city_line} et je pense que UNPRO pourrait vous apporter plus de rendez-vous cette saison. Vous pouvez essayer 7 jours à 1 $ ici: {link}. Je peux aussi vous aider à le mettre en place.",
  },
  {
    key: "followup",
    label: "Suivi",
    description: "Après le SMS UNPRO officiel.",
    template:
      "Rebonjour {greeting}, ici {affiliate_first_name} avec UNPRO. Juste un mot personnel pour confirmer que l'offre d'essai à 1 $ est toujours active pour {company_or_you}: {link}. Question rapide, j'y réponds directement.",
  },
];

export const DEFAULT_VARIANT: SmsVariantKey = "warm";
