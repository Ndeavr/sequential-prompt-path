/**
 * UNPRO — Compatibility defaults by profession.
 * Feeds "Compatible avec / Moins adapté pour" when contractor hasn't set values.
 */

export interface CompatibilityProfile {
  fits: string[];
  not_fits: string[];
}

const DEFAULTS: Record<string, CompatibilityProfile> = {
  peintre: {
    fits: [
      "Maisons unifamiliales",
      "Condos",
      "Propriétaires occupants",
      "Travaux esthétiques",
      "Rafraîchissement avant vente",
    ],
    not_fits: ["Travaux commerciaux majeurs", "Projets industriels"],
  },
  plombier: {
    fits: ["Maisons unifamiliales", "Condos", "Rénovations résidentielles", "Urgences"],
    not_fits: ["Projets industriels", "Infrastructures municipales"],
  },
  electricien: {
    fits: ["Maisons unifamiliales", "Condos", "Rénovations", "Bornes de recharge résidentielles"],
    not_fits: ["Projets industriels", "Haute tension"],
  },
  couvreur: {
    fits: ["Maisons unifamiliales", "Duplex/Triplex", "Toitures résidentielles"],
    not_fits: ["Toitures commerciales majeures", "Projets industriels"],
  },
  general: {
    fits: [
      "Maisons unifamiliales",
      "Condos",
      "Rénovations complètes",
      "Agrandissements",
      "Sous-sols",
    ],
    not_fits: ["Projets industriels majeurs"],
  },
  isolation: {
    fits: [
      "Maisons unifamiliales",
      "Condos",
      "Rénovations énergétiques",
      "Amélioration efficacité",
    ],
    not_fits: ["Projets industriels"],
  },
};

const DEFAULT_PROFILE: CompatibilityProfile = {
  fits: ["Maisons unifamiliales", "Condos", "Propriétaires occupants"],
  not_fits: ["Projets industriels"],
};

export function getCompatibilityDefaults(
  categorySlug: string | null | undefined
): CompatibilityProfile {
  if (!categorySlug) return DEFAULT_PROFILE;
  const key = categorySlug.toLowerCase().replace(/[\s-]+/g, "_");
  return DEFAULTS[key] ?? DEFAULT_PROFILE;
}
