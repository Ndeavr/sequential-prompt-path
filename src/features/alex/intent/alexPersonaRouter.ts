/**
 * alexPersonaRouter — Detects user persona from free text BEFORE Alex responds.
 *
 * Rule: persona detection must run on the FIRST user utterance so Alex picks
 * the right framing (homeowner vs. contractor vs. property manager).
 *
 * For authenticated users with an explicit role, the auth role wins
 * (see src/config/alexModes.ts).
 */

export type DetectedPersona =
  | "HOMEOWNER"
  | "CONTRACTOR"
  | "PROPERTY_MANAGER"
  | "PARTNER"
  | "UNKNOWN";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

// Order matters: most specific personas first.
const CONTRACTOR_TRIGGERS = [
  "plus de clients",
  "plus de contrats",
  "plus de rendez-vous",
  "plus de rendez vous",
  "plus d appels",
  "plus d'appels",
  "obtenir des contrats",
  "developper mon entreprise",
  "developper ma business",
  "developper ma compagnie",
  "developper mon business",
  "ma visibilite",
  "visibilite ia",
  "visibilite google",
  "referencement",
  "seo",
  "marketing",
  "publicite",
  "google ads",
  "facebook ads",
  "leads",
  "soumissions",
  "soumission",
  "rbq",
  "neq",
  "mon entreprise",
  "mes employes",
  "chiffre d affaires",
  "chiffre d'affaires",
  "fiche unpro",
  "score aipp",
  "je suis entrepreneur",
  "je suis un entrepreneur",
  "je suis contracteur",
  "je suis un pro",
  "je suis professionnel",
  "je veux offrir mes services",
];

const PROPERTY_MANAGER_TRIGGERS = [
  "copropriete",
  "syndicat",
  "loi 16",
  "gestionnaire d immeuble",
  "gestionnaire d'immeuble",
  "gestion d immeuble",
  "gestion d'immeuble",
  "immeuble locatif",
  "condo manager",
  "syndic",
  "nombre d unites",
  "nombre d'unites",
];

const HOMEOWNER_TRIGGERS = [
  "ma maison",
  "mon condo",
  "j ai un probleme de",
  "j'ai un probleme de",
  "infiltration",
  "chauffage",
  "humidite",
  "renovation",
  "renover",
  "fuite",
  "thermopompe",
  "toiture",
  "isolation",
  "plomberie chez moi",
  "electricien pour ma maison",
];

const PARTNER_TRIGGERS = [
  "partenariat",
  "partenaire",
  "integration api",
  "white label",
  "marque blanche",
];

function anyMatch(haystack: string, needles: string[]): boolean {
  for (const n of needles) {
    if (haystack.includes(n)) return true;
  }
  return false;
}

export function detectPersona(text: string | null | undefined): DetectedPersona {
  if (!text) return "UNKNOWN";
  const n = norm(text);
  if (!n) return "UNKNOWN";

  if (anyMatch(n, CONTRACTOR_TRIGGERS)) return "CONTRACTOR";
  if (anyMatch(n, PROPERTY_MANAGER_TRIGGERS)) return "PROPERTY_MANAGER";
  if (anyMatch(n, HOMEOWNER_TRIGGERS)) return "HOMEOWNER";
  if (anyMatch(n, PARTNER_TRIGGERS)) return "PARTNER";
  return "UNKNOWN";
}
