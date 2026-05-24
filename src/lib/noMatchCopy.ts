/**
 * noMatchCopy — Single source of truth for UNPRO's premium empty-state messaging.
 * Replaces every "no provider available" dead-end with conversion-oriented copy.
 */

const PRO_NOUNS: Record<string, string> = {
  painting: "peintre",
  peinture: "peintre",
  roofing: "couvreur",
  toiture: "couvreur",
  electrician: "électricien",
  electricien: "électricien",
  electricite: "électricien",
  plumber: "plombier",
  plomberie: "plombier",
  hvac: "spécialiste CVAC",
  cvac: "spécialiste CVAC",
  chauffage: "spécialiste CVAC",
  climatisation: "spécialiste CVAC",
  landscaping: "paysagiste",
  paysagement: "paysagiste",
  notary: "notaire",
  notaire: "notaire",
  inspection: "inspecteur",
  inspector: "inspecteur",
  condo: "gestionnaire de copropriété",
  syndic: "gestionnaire de copropriété",
};

const GENERIC_CITY_VALUES = new Set([
  "",
  "votre ville",
  "votre secteur",
  "unknown",
  "n/a",
]);

export function getProNoun(service?: string): string {
  if (!service) return "professionnel";
  const key = service.toLowerCase().trim();
  if (PRO_NOUNS[key]) return PRO_NOUNS[key];
  for (const [k, v] of Object.entries(PRO_NOUNS)) {
    if (key.includes(k)) return v;
  }
  return "professionnel";
}

export function getCityFragment(city?: string): string {
  if (!city) return "dans votre secteur";
  const c = city.trim();
  if (GENERIC_CITY_VALUES.has(c.toLowerCase())) return "dans votre secteur";
  if (/^montr[eé]al$/i.test(c)) return "dans le secteur de Montréal";
  return `à ${c}`;
}

export function buildNoMatchTitle(opts: { service?: string; city?: string }): string {
  const noun = getProNoun(opts.service);
  const cityFragment = getCityFragment(opts.city);
  return `Aucun ${noun} disponible ne correspond actuellement à vos critères ${cityFragment}.`;
}

export interface NoMatchBullet {
  text: string;
}

export function buildNoMatchBullets(opts: { isAuthed: boolean; hasEstimate: boolean }): NoMatchBullet[] {
  if (opts.isAuthed) {
    return [
      { text: "Activer la recherche prioritaire élargie par l'IA" },
      { text: "Être averti dès qu'un professionnel compatible devient disponible" },
      { text: "Recevoir des recommandations affinées en continu" },
      { text: opts.hasEstimate ? "Conserver votre estimation et votre projet" : "Suivre vos demandes depuis votre espace" },
    ];
  }
  return [
    { text: "Sauvegarder votre projet et votre estimation" },
    { text: "Recevoir des recommandations prioritaires" },
    { text: "Être averti automatiquement lorsqu'un professionnel compatible devient disponible" },
    { text: "Permettre à l'IA UNPRO d'élargir intelligemment la recherche" },
  ];
}

export function buildAlexVoiceLine(opts: { service?: string; city?: string }): string {
  const noun = getProNoun(opts.service);
  const cityFragment = getCityFragment(opts.city);
  return `Je peux élargir la recherche ou vous prévenir dès qu'un ${noun} compatible devient disponible ${cityFragment}.`;
}

export function getAlexNoMatchProactive(service?: string, city?: string): string {
  return buildAlexVoiceLine({ service, city });
}

export function getNoMatchStatusCopy(opts: { hasEstimate: boolean }): string {
  return opts.hasEstimate
    ? "Votre estimation a été sauvegardée. Recherche intelligente active."
    : "Recherche intelligente active. Notification prioritaire disponible avec un compte gratuit.";
}

/** Returns true if any known estimate exists in sessionStorage. */
export function hasSavedEstimate(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const keys = [
      "unpro:lastEstimate",
      "unpro:painting:lastEstimate",
      "unpro:growthDiagnostic",
      "painting_calculator_session",
    ];
    return keys.some((k) => {
      const v = window.sessionStorage.getItem(k) || window.localStorage.getItem(k);
      return !!v && v !== "null" && v !== "{}";
    });
  } catch {
    return false;
  }
}

export const SOCIAL_PROOF_LINE =
  "Des centaines de propriétaires utilisent UNPRO chaque semaine pour trouver le bon professionnel.";

/** Banned phrases — never expose to users. Used for lint/test. */
export const BANNED_NO_MATCH_PHRASES = [
  "Nous n'avons pas encore",
  "Aucun partenaire",
  "Service indisponible",
  "Rien trouvé",
  "Pas de résultats",
];
