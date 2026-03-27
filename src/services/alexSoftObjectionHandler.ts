/**
 * AlexSoftObjectionHandler — Detects and handles soft objections naturally.
 */

export type ObjectionType =
  | "hesitation"
  | "trust_concern"
  | "spam_fear"
  | "commitment_fear"
  | "time_waste_fear"
  | "comparison_need";

interface ObjectionPattern {
  type: ObjectionType;
  keywords: string[];
  responses: string[];
}

const PATTERNS: ObjectionPattern[] = [
  {
    type: "hesitation",
    keywords: ["pas sûr", "je sais pas", "hésit", "peut-être", "réfléchir"],
    responses: [
      "On peut juste regarder, sans rien confirmer.",
      "C'est normal d'hésiter. Je peux déjà vous montrer le meilleur fit.",
      "Prenez votre temps. Je garde tout ça prêt pour vous.",
    ],
  },
  {
    type: "trust_concern",
    keywords: ["confiance", "fiable", "arnaque", "certain", "garanti"],
    responses: [
      "Tous nos pros sont vérifiés. Je peux vous montrer les badges.",
      "On vérifie les licences, les assurances et les avis.",
      "Le but, c'est justement d'éviter les mauvaises surprises.",
    ],
  },
  {
    type: "spam_fear",
    keywords: ["spam", "appeler", "harceler", "sollicit"],
    responses: [
      "Vous n'allez pas recevoir 3 soumissions inutiles.",
      "On vous contacte une seule fois, avec le bon pro.",
      "Pas de spam, juste la bonne personne au bon moment.",
    ],
  },
  {
    type: "commitment_fear",
    keywords: ["obligé", "engag", "forcer", "obliger"],
    responses: [
      "Vous n'êtes pas obligé de réserver tout de suite.",
      "Je peux juste vous montrer les options.",
      "Aucun engagement. On regarde ensemble.",
    ],
  },
  {
    type: "time_waste_fear",
    keywords: ["perdre du temps", "long", "compliqué", "trop de temps"],
    responses: [
      "Le but, c'est surtout de vous faire gagner du temps.",
      "En 2 minutes, je vous montre le meilleur choix.",
      "C'est justement pour éviter les longues démarches.",
    ],
  },
  {
    type: "comparison_need",
    keywords: ["comparer", "soumission", "devis", "autre option", "alternatives"],
    responses: [
      "Je comprends. Je vous montre les autres options aussi.",
      "Mais celui-ci reste le plus adapté pour vous.",
      "Je peux vous montrer pourquoi je le recommande en premier.",
    ],
  },
];

export interface ObjectionResult {
  detected: boolean;
  type: ObjectionType | null;
  response: string | null;
}

export function detectObjection(text: string): ObjectionResult {
  const lower = text.toLowerCase();
  for (const pattern of PATTERNS) {
    if (pattern.keywords.some((kw) => lower.includes(kw))) {
      const response = pattern.responses[Math.floor(Math.random() * pattern.responses.length)];
      return { detected: true, type: pattern.type, response };
    }
  }
  return { detected: false, type: null, response: null };
}
