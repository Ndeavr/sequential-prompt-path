export type IsrAnswerKey =
  | "capacity"
  | "territory"
  | "project_type"
  | "objective"
  | "ai_priority";

export interface IsrQuestion {
  key: IsrAnswerKey;
  label: string;
  options: string[];
}

export const ISR_BRAND = {
  company: "Isolation Solution Royal",
  legal: "9480-0976 Québec inc.",
  website: "isroyal.ca",
  phones: ["514-249-9522", "514-941-3141"],
  territory: "Laval · Montréal · Rive-Nord · Lanaudière",
  positioning: "Spécialiste de l'entretoit",
  services: [
    "Isolation",
    "Décontamination",
    "Étanchéité / calfeutrage",
    "Ventilation",
    "Déblocage des soffites",
    "Trappes d'accès",
    "Tuyaux de sécheuse",
    "Moisissure",
    "Vermiculite",
    "Animaux nuisibles",
  ],
};

export const ISR_QUESTIONS: IsrQuestion[] = [
  {
    key: "capacity",
    label: "Combien de rendez-vous qualifiés ISR peut gérer par mois sans nuire à la qualité?",
    options: ["5", "10", "25", "50+"],
  },
  {
    key: "territory",
    label: "Quel territoire est prioritaire?",
    options: ["Laval", "Montréal", "Rive-Nord", "Lanaudière", "Tous ces territoires"],
  },
  {
    key: "project_type",
    label: "Quel type de projet ISR veut prioriser?",
    options: [
      "Isolation d'entretoit",
      "Décontamination moisissure",
      "Ventilation / soffites",
      "Vermiculite",
      "Étanchéité / calfeutrage",
      "Tous les services d'entretoit",
    ],
  },
  {
    key: "objective",
    label: "Quel objectif est le plus important?",
    options: [
      "Plus d'appels",
      "Plus de rendez-vous garantis",
      "Meilleure visibilité IA",
      "Dominer mon territoire",
      "Maximiser le revenu par mois",
    ],
  },
  {
    key: "ai_priority",
    label: "ISR veut-il une présence IA maximale avec priorité de recommandation sur son territoire?",
    options: ["Oui", "Non", "À évaluer"],
  },
];

export const ISR_PLANS = [
  { name: "Croissance", price: 149, tag: "Démarrage" },
  { name: "Pro", price: 299, tag: "Accélération" },
  { name: "Premium", price: 599, tag: "Performance" },
  { name: "Domination", price: 1499, tag: "Domination IA" },
] as const;

export const ISR_SIGNATURE_FEATURES = [
  "50 rendez-vous exclusifs inclus",
  "Priorité IA maximale",
  "Optimisation AIPP avancée",
  "Territoires prioritaires",
  "Analyse des avis et positionnement concurrentiel",
  "Activation accélérée",
  "Pas de leads partagés",
];

export const ISR_PROMO_CODE = "ISR_SIGNATURE_TEST";

export type IsrAnswers = Partial<Record<IsrAnswerKey, string>>;

export function recommendPlan(a: IsrAnswers): "Domination" | null {
  if (!a.capacity || !a.territory || !a.project_type || !a.objective || !a.ai_priority) {
    return null;
  }
  // Per product rule: never downgrade after intent. ISR demo always lands on Domination.
  return "Domination";
}

export const ISR_RECOMMENDATION_REASON =
  "ISR couvre plusieurs services d'entretoit à forte valeur, plusieurs territoires et peut transformer les rendez-vous qualifiés en contrats rentables. Le plan Domination maximise la visibilité IA, la priorité territoriale et le volume de rendez-vous exclusifs.";

export const ISR_NO_DOWNGRADE_LINE =
  "Vu les objectifs ISR, je ne recommande pas de réduire le plan. Le risque serait de manquer des opportunités qualifiées dans vos territoires prioritaires.";
