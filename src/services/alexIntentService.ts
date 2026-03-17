/**
 * UNPRO — Alex Intent Service
 * Deterministic intent classification from user messages.
 */

export type AlexIntent =
  | "find_contractor"
  | "analyze_quote"
  | "book_appointment"
  | "home_maintenance"
  | "property_improvement"
  | "describe_project"
  | "general";

interface IntentRule {
  intent: AlexIntent;
  keywords: string[];
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: "find_contractor",
    keywords: [
      "trouver", "cherche", "entrepreneur", "couvreur", "plombier",
      "électricien", "professionnel", "artisan", "recommander", "suggérer",
    ],
  },
  {
    intent: "analyze_quote",
    keywords: [
      "soumission", "devis", "quote", "analyser", "comparer", "prix",
      "montant", "coût", "estimation", "facture",
    ],
  },
  {
    intent: "book_appointment",
    keywords: [
      "rendez-vous", "rdv", "rencontrer", "appointment", "planifier",
      "disponibilité", "horaire", "booking",
    ],
  },
  {
    intent: "home_maintenance",
    keywords: [
      "entretien", "maintenance", "vérifier", "inspecter", "prévenir",
      "saisonnier", "automne", "printemps", "hiver",
    ],
  },
  {
    intent: "property_improvement",
    keywords: [
      "rénover", "améliorer", "agrandir", "transformer", "moderniser",
      "score maison", "valeur", "investissement",
    ],
  },
  {
    intent: "describe_project",
    keywords: [
      "problème", "fuite", "moisissure", "infiltration", "brisé",
      "cassé", "dommage", "urgence", "urgent", "projet",
    ],
  },
];

export const detectIntent = (message: string): AlexIntent => {
  const lower = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let bestIntent: AlexIntent = "general";
  let bestScore = 0;

  for (const rule of INTENT_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      const normalizedKw = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (lower.includes(normalizedKw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = rule.intent;
    }
  }

  return bestIntent;
};

/**
 * Detect contractor category from message.
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  toiture: ["toit", "toiture", "couvreur", "bardeaux", "gouttière"],
  isolation: ["isolation", "isoler", "entretoit", "grenier", "laine"],
  plomberie: ["plombier", "plomberie", "fuite", "tuyau", "eau", "robinet", "drain"],
  electricite: ["électricien", "électricité", "panneau", "filage", "prise"],
  fondation: ["fondation", "fissure", "sous-sol", "drain français", "imperméabilisation"],
  fenetres: ["fenêtre", "porte", "vitrage", "châssis"],
  revetement: ["revêtement", "bardage", "parement", "siding"],
  renovation: ["rénovation", "rénover", "cuisine", "salle de bain", "plancher"],
  chauffage: ["chauffage", "climatisation", "thermopompe", "fournaise", "ventilation"],
  peinture: ["peinture", "peindre", "peintre"],
};

// ===== PROPERTY TYPE DETECTION =====
export type PropertyFamily = "single_family" | "condominium_strata" | "multi_family";
export type PropertyTypeSlug =
  | "bungalow" | "cottage" | "chalet" | "jumele" | "maison_rangee"
  | "split_level" | "shoebox" | "bi_generation" | "unifamiliale_autre"
  | "condo_divise" | "condo_indivise"
  | "duplex" | "triplex" | "plex" | "immeuble_revenus";

interface PropertyTypeDetection {
  family: PropertyFamily;
  type: PropertyTypeSlug;
}

const PROPERTY_TYPE_KEYWORDS: Array<{ type: PropertyTypeSlug; family: PropertyFamily; keywords: string[] }> = [
  { type: "bungalow", family: "single_family", keywords: ["bungalow", "plain-pied", "plain pied", "maison plain-pied"] },
  { type: "cottage", family: "single_family", keywords: ["cottage", "maison a etages", "maison deux etages", "maison 2 etages"] },
  { type: "chalet", family: "single_family", keywords: ["chalet", "chalet 4 saisons", "chalet 3 saisons"] },
  { type: "jumele", family: "single_family", keywords: ["jumele", "maison jumelee"] },
  { type: "maison_rangee", family: "single_family", keywords: ["maison en rangee", "maison de ville", "townhouse"] },
  { type: "split_level", family: "single_family", keywords: ["split level", "split-level", "niveau partage"] },
  { type: "shoebox", family: "single_family", keywords: ["shoebox"] },
  { type: "bi_generation", family: "single_family", keywords: ["bi-generation", "bigeneration", "intergeneration", "maison intergeneration", "intergenerationnelle", "bi generation"] },
  { type: "condo_divise", family: "condominium_strata", keywords: ["condo divise", "condo", "copropriete", "copropriete divise", "condominium"] },
  { type: "condo_indivise", family: "condominium_strata", keywords: ["condo indivise", "copropriete indivise", "indivis"] },
  { type: "duplex", family: "multi_family", keywords: ["duplex", "2 logements"] },
  { type: "triplex", family: "multi_family", keywords: ["triplex", "3 logements"] },
  { type: "plex", family: "multi_family", keywords: ["plex", "4plex", "5plex", "6plex", "quadruplex"] },
  { type: "immeuble_revenus", family: "multi_family", keywords: ["immeuble a revenus", "immeuble locatif", "immeuble a logements", "immeuble 4 logements", "multilogement 4", "immeuble revenus", "6 logements", "8 logements", "12 logements"] },
];

export const detectPropertyType = (message: string): PropertyTypeDetection | null => {
  const lower = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let bestMatch: PropertyTypeDetection | null = null;
  let bestScore = 0;

  for (const entry of PROPERTY_TYPE_KEYWORDS) {
    let score = 0;
    for (const kw of entry.keywords) {
      const normalizedKw = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (lower.includes(normalizedKw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { family: entry.family, type: entry.type };
    }
  }

  return bestMatch;
};

export const detectCategory = (message: string): string | null => {
  const lower = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let bestCat: string | null = null;
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      const normalizedKw = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (lower.includes(normalizedKw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  }

  return bestCat;
};
