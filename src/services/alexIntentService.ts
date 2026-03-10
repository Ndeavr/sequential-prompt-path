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
