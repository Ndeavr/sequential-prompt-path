/**
 * AlexAnswerBuilder — Builds structured 4-block answers.
 * 
 * Block 1: Comprehension ("Je vois que...")
 * Block 2: Useful answer (technical insight)
 * Block 3: Context (location-specific, history-based)
 * Block 4: Action (next step CTA)
 * 
 * Adapts by question type: problem, comparison, estimation, validation.
 */

import type { ResolvedContext } from "./alexContextResolver";
import type { QuestionType, StructuredAnswer } from "./alexCognitiveRulesEngine";
import { classifyQuestionType, detectUserTone, adaptTone, getMissingFields } from "./alexCognitiveRulesEngine";
import type { AlexSessionMemory } from "./alexMemoryEngine";

// ─── COMPREHENSION BUILDERS ───
const COMPREHENSION_TEMPLATES: Record<string, (ctx: ResolvedContext) => string> = {
  problem_with_service: (ctx) => `Je vois que vous avez un problème ${ctx.knownService ? `en lien avec ${ctx.knownService}` : ""}${ctx.knownCity ? ` à ${ctx.knownCity}` : ""}.`,
  project_with_service: (ctx) => `Je comprends votre projet ${ctx.knownService ? `de ${ctx.knownService}` : ""}${ctx.knownCity ? ` à ${ctx.knownCity}` : ""}.`,
  estimation: (ctx) => `Vous aimeriez connaître le coût ${ctx.knownService ? `pour ${ctx.knownService}` : "de votre projet"}.`,
  comparison: (_ctx: ResolvedContext) => `Bonne question pour la comparaison.`,
  validation: (ctx: ResolvedContext) => `Je vais vérifier ça ${ctx.knownService ? `pour ${ctx.knownService}` : "pour vous"}.`,
  general: (_ctx: ResolvedContext) => `Je comprends votre demande.`,
};

// ─── USEFUL ANSWER TEMPLATES ───
const SERVICE_INSIGHTS: Record<string, string> = {
  "Plombier": "Les fuites non traitées peuvent causer des dommages structurels importants. Un diagnostic rapide est recommandé.",
  "Couvreur": "L'état de la toiture affecte directement l'isolation et la structure. Une inspection préventive peut éviter des coûts majeurs.",
  "Couvreur / Isolation": "Les barrages de glace sont souvent causés par une mauvaise ventilation ou isolation de l'entretoit. C'est un problème courant au Québec.",
  "Isolation": "Une bonne isolation peut réduire vos coûts d'énergie de 20 à 40 %. L'entretoit est souvent le point faible.",
  "Électricien": "Les problèmes électriques nécessitent toujours un professionnel certifié. La sécurité est prioritaire.",
  "Rénovation cuisine": "La cuisine est le projet de rénovation avec le meilleur retour sur investissement. Comptez entre 15 000 $ et 50 000 $ selon l'ampleur.",
  "Rénovation salle de bain": "Une rénovation de salle de bain prend généralement 2 à 4 semaines. Le budget moyen se situe entre 10 000 $ et 30 000 $.",
  "Peintre": "La peinture est l'amélioration la plus rentable pour rafraîchir un espace. Prévoyez 2 à 5 jours pour un intérieur complet.",
  "Fondation": "Les problèmes de fondation sont sérieux mais traitables. Un diagnostic précis est essentiel avant toute intervention.",
  "Chauffagiste": "Un système de chauffage bien entretenu dure 15 à 25 ans. L'efficacité énergétique peut faire une grande différence.",
  "Décontamination": "La moisissure affecte la qualité de l'air et la santé. Un traitement professionnel est fortement recommandé.",
};

// ─── ESTIMATION RANGES ───
const ESTIMATION_RANGES: Record<string, string> = {
  "Plombier": "150 $ à 800 $ pour une intervention standard, 2 000 $ à 8 000 $ pour un remplacement majeur.",
  "Couvreur": "5 000 $ à 15 000 $ pour une toiture résidentielle standard.",
  "Isolation": "2 000 $ à 6 000 $ pour l'isolation d'un entretoit.",
  "Électricien": "200 $ à 3 000 $ selon la complexité des travaux.",
  "Rénovation cuisine": "15 000 $ à 50 000 $ selon la taille et les matériaux.",
  "Rénovation salle de bain": "10 000 $ à 30 000 $ selon l'ampleur.",
  "Peintre": "1 500 $ à 5 000 $ pour un intérieur complet.",
  "Fondation": "5 000 $ à 25 000 $ selon le type de réparation.",
};

// ─── ACTION BUILDERS ───
function buildAction(ctx: ResolvedContext, memory: AlexSessionMemory): string {
  if (ctx.shouldRecommend) {
    return "Je peux vous trouver un professionnel disponible dans votre secteur.";
  }
  if (ctx.shouldAskPhoto) {
    return "Une photo m'aiderait à être plus précis. Pouvez-vous en envoyer une ?";
  }
  if (ctx.shouldAskLocation) {
    return "Dans quelle ville se situe votre propriété ?";
  }
  if (!memory.need_qualified) {
    return "Pouvez-vous me donner plus de détails sur votre besoin ?";
  }
  return "Comment souhaitez-vous procéder ?";
}

// ─── FOLLOW-UP SUGGESTIONS ───
function buildFollowUps(ctx: ResolvedContext, memory: AlexSessionMemory): string[] {
  const suggestions: string[] = [];
  
  if (!memory.has_photo && ctx.shouldAskPhoto) {
    suggestions.push("📷 Envoyer une photo");
  }
  if (ctx.shouldRecommend) {
    suggestions.push("🔍 Voir les professionnels disponibles");
  }
  if (memory.recommended_contractor_id && !memory.booking_confirmed) {
    suggestions.push("📅 Planifier un rendez-vous");
  }
  if (ctx.knownService && ESTIMATION_RANGES[ctx.knownService]) {
    suggestions.push("💰 Estimer le coût");
  }
  suggestions.push("💬 Poser une question");

  return suggestions.slice(0, 4);
}

// ─── MAIN BUILDER ───
export function buildStructuredAnswer(
  userMessage: string,
  context: ResolvedContext,
  memory: AlexSessionMemory,
): StructuredAnswer {
  const questionType = classifyQuestionType(userMessage);
  const userTone = detectUserTone(userMessage);
  const missingFields = getMissingFields(memory);

  // Block 1: Comprehension
  let comprehension: string;
  switch (questionType) {
    case "problem":
      comprehension = COMPREHENSION_TEMPLATES.problem_with_service(context);
      break;
    case "project":
      comprehension = COMPREHENSION_TEMPLATES.project_with_service(context);
      break;
    case "estimation":
      comprehension = COMPREHENSION_TEMPLATES.estimation(context);
      break;
    case "comparison":
      comprehension = COMPREHENSION_TEMPLATES.comparison(context);
      break;
    case "validation":
      comprehension = COMPREHENSION_TEMPLATES.validation(context);
      break;
    default:
      comprehension = COMPREHENSION_TEMPLATES.general(context);
  }

  // Block 2: Useful answer
  let usefulAnswer: string;
  if (questionType === "estimation" && context.knownService && ESTIMATION_RANGES[context.knownService]) {
    usefulAnswer = `Fourchette typique : ${ESTIMATION_RANGES[context.knownService]}`;
  } else if (context.knownService && SERVICE_INSIGHTS[context.knownService]) {
    usefulAnswer = SERVICE_INSIGHTS[context.knownService];
  } else {
    usefulAnswer = "Je vais analyser votre situation pour vous donner la meilleure recommandation.";
  }

  // Block 3: Context
  let contextBlock: string | null = null;
  if (context.knownCity) {
    contextBlock = `Dans votre secteur de ${context.knownCity}, ce type de service est bien couvert par nos professionnels vérifiés.`;
  } else if (context.turnCount > 3) {
    contextBlock = "Basé sur notre conversation, je cerne bien votre besoin.";
  }

  // Block 4: Action
  const action = buildAction(context, memory);

  // Tone adaptation
  comprehension = adaptTone(comprehension, userTone);

  // Confidence
  const confidenceScore = context.confidenceLevel;

  return {
    comprehension,
    usefulAnswer,
    context: contextBlock,
    action,
    followUpSuggestions: buildFollowUps(context, memory),
    questionType,
    confidenceScore,
  };
}

/**
 * Format structured answer into a single conversational string.
 */
export function formatStructuredAnswer(answer: StructuredAnswer): string {
  const parts = [answer.comprehension];
  
  if (answer.usefulAnswer && answer.usefulAnswer !== answer.comprehension) {
    parts.push(answer.usefulAnswer);
  }
  
  if (answer.context) {
    parts.push(answer.context);
  }
  
  parts.push(answer.action);
  
  return parts.join("\n\n");
}
