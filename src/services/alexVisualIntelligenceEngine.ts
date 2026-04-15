/**
 * AlexVisualIntelligenceEngine — Photo prompting, visual analysis, and projection.
 * 
 * Detects when visual input would accelerate diagnosis or enable design projection.
 * Activates "visual mode" which relaxes the 1-question limit for guided photo flows.
 */

import type { AlexSessionMemory } from "./alexMemoryEngine";
import type { ResolvedContext } from "./alexContextResolver";

export interface PhotoPromptDecision {
  shouldAskPhoto: boolean;
  reason: string;
  contextType: "problem" | "design" | "uncertainty";
  promptMessage: string;
  benefit: string;
}

export interface VisualAnalysisResult {
  summary: string;
  issueDetected: string | null;
  confidenceScore: number;
  recommendation: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  interventionType: string;
}

export interface VisualProjection {
  description: string;
  styleType: string;
  estimatedCost: string | null;
  features: string[];
}

// ─── PROBLEM KEYWORDS (photo adds diagnostic value) ───
const PROBLEM_PHOTO_TRIGGERS: Record<string, { benefit: string; prompt: string }> = {
  "fuite": {
    benefit: "identifier la source et l'ampleur du dégât",
    prompt: "Une photo de la zone touchée me permettrait de confirmer l'origine de la fuite.",
  },
  "moisissure": {
    benefit: "évaluer l'étendue de la contamination",
    prompt: "Envoyez-moi une photo pour que j'évalue l'étendue de la moisissure.",
  },
  "fissure": {
    benefit: "déterminer si c'est structurel ou cosmétique",
    prompt: "Une photo me permettrait de distinguer une fissure structurelle d'une fissure cosmétique.",
  },
  "toiture": {
    benefit: "évaluer l'état des bardeaux et la présence de dommages",
    prompt: "Pouvez-vous photographier votre toiture ? Je pourrai évaluer son état.",
  },
  "barrage_glace": {
    benefit: "confirmer le diagnostic et planifier l'intervention",
    prompt: "Une photo du barrage de glace m'aiderait à confirmer le problème de ventilation.",
  },
  "isolation": {
    benefit: "identifier les zones de perte de chaleur",
    prompt: "Si possible, envoyez une photo de votre entretoit ou des zones problématiques.",
  },
  "fondation": {
    benefit: "évaluer la gravité des fissures ou infiltrations",
    prompt: "Une photo de la fondation me permettrait d'évaluer la situation avec précision.",
  },
  "humidite": {
    benefit: "identifier la source et les dommages visibles",
    prompt: "Montrez-moi la zone affectée pour un diagnostic plus précis.",
  },
  "infiltration": {
    benefit: "localiser le point d'entrée de l'eau",
    prompt: "Une photo m'aiderait à localiser le point d'infiltration.",
  },
};

// ─── DESIGN KEYWORDS (photo enables projection) ───
const DESIGN_PHOTO_TRIGGERS: Record<string, { benefit: string; prompt: string }> = {
  "cuisine": {
    benefit: "générer une projection visuelle de votre nouvelle cuisine",
    prompt: "Montrez-moi votre cuisine actuelle et dites-moi ce que vous imaginez. Je peux vous montrer un aperçu.",
  },
  "salle de bain": {
    benefit: "visualiser les possibilités de transformation",
    prompt: "Envoyez une photo de votre salle de bain, je vous montrerai ce que ça pourrait donner.",
  },
  "renovation": {
    benefit: "proposer des options de design adaptées à votre espace",
    prompt: "Une photo de l'espace actuel me permettrait de vous proposer des options.",
  },
  "aménagement": {
    benefit: "optimiser l'utilisation de votre espace",
    prompt: "Montrez-moi l'espace à aménager pour des suggestions personnalisées.",
  },
  "peinture": {
    benefit: "simuler différentes couleurs sur vos murs",
    prompt: "Avec une photo de la pièce, je peux vous montrer différentes options de couleur.",
  },
};

// ─── PHOTO PROMPT DECISION ENGINE ───
export function shouldPromptForPhoto(
  memory: AlexSessionMemory,
  context: ResolvedContext,
  userMessage: string,
): PhotoPromptDecision {
  // Skip if photo already provided
  if (memory.has_photo) {
    return { shouldAskPhoto: false, reason: "already_has_photo", contextType: "problem", promptMessage: "", benefit: "" };
  }

  const lower = userMessage.toLowerCase();

  // Check problem triggers
  for (const [keyword, trigger] of Object.entries(PROBLEM_PHOTO_TRIGGERS)) {
    if (lower.includes(keyword) || memory.problem_type === keyword) {
      return {
        shouldAskPhoto: true,
        reason: `problem_keyword:${keyword}`,
        contextType: "problem",
        promptMessage: trigger.prompt,
        benefit: trigger.benefit,
      };
    }
  }

  // Check design triggers
  for (const [keyword, trigger] of Object.entries(DESIGN_PHOTO_TRIGGERS)) {
    if (lower.includes(keyword)) {
      return {
        shouldAskPhoto: true,
        reason: `design_keyword:${keyword}`,
        contextType: "design",
        promptMessage: trigger.prompt,
        benefit: trigger.benefit,
      };
    }
  }

  // Uncertainty: vague message with no clear problem
  if (!memory.need_qualified && !memory.problem_type && context.turnCount >= 2) {
    return {
      shouldAskPhoto: true,
      reason: "uncertainty_after_2_turns",
      contextType: "uncertainty",
      promptMessage: "Une photo m'aiderait à mieux comprendre votre situation.",
      benefit: "réduire le nombre de questions et être plus précis",
    };
  }

  return { shouldAskPhoto: false, reason: "no_trigger", contextType: "problem", promptMessage: "", benefit: "" };
}

// ─── VISUAL MODE ───
export interface VisualModeState {
  active: boolean;
  contextType: "problem" | "design" | "uncertainty";
  questionsAllowed: number; // Relaxed limit
  photoReceived: boolean;
  analysisComplete: boolean;
}

export function createVisualModeState(contextType: "problem" | "design" | "uncertainty"): VisualModeState {
  return {
    active: true,
    contextType,
    questionsAllowed: contextType === "design" ? 5 : 3, // More questions for design flow
    photoReceived: false,
    analysisComplete: false,
  };
}

// ─── MOCK VISUAL ANALYSIS ───
export function generateMockAnalysis(problemType: string | null): VisualAnalysisResult {
  const analyses: Record<string, VisualAnalysisResult> = {
    "barrage_glace": {
      summary: "Accumulation de glace visible sur le bord du toit, causée par une mauvaise ventilation de l'entretoit.",
      issueDetected: "Barrage de glace + ventilation insuffisante",
      confidenceScore: 0.92,
      recommendation: "Inspection de la ventilation et de l'isolation de l'entretoit recommandée.",
      riskLevel: "high",
      interventionType: "Couvreur + isolateur",
    },
    "fuite": {
      summary: "Traces d'infiltration d'eau visibles. Possible problème de membrane ou de solin.",
      issueDetected: "Infiltration d'eau active",
      confidenceScore: 0.85,
      recommendation: "Intervention rapide recommandée pour éviter des dommages structurels.",
      riskLevel: "high",
      interventionType: "Plombier ou couvreur",
    },
    "moisissure": {
      summary: "Présence de moisissure visible sur les surfaces. Zone humide détectée.",
      issueDetected: "Contamination fongique",
      confidenceScore: 0.88,
      recommendation: "Décontamination professionnelle recommandée. Ne pas toucher sans protection.",
      riskLevel: "critical",
      interventionType: "Décontamination",
    },
    "fissure": {
      summary: "Fissure visible sur la surface. Largeur et orientation à évaluer sur place.",
      issueDetected: "Fissure — évaluation requise",
      confidenceScore: 0.7,
      recommendation: "Inspection par un expert en fondation pour déterminer si structurelle.",
      riskLevel: "medium",
      interventionType: "Expert en fondation",
    },
  };

  return analyses[problemType || ""] || {
    summary: "Analyse de l'image en cours. Éléments visuels détectés.",
    issueDetected: null,
    confidenceScore: 0.6,
    recommendation: "Un professionnel pourra confirmer le diagnostic sur place.",
    riskLevel: "medium",
    interventionType: "Inspection générale",
  };
}

// ─── MOCK VISUAL PROJECTION ───
export function generateMockProjection(roomType: string): VisualProjection {
  const projections: Record<string, VisualProjection> = {
    "cuisine": {
      description: "Cuisine moderne avec îlot central, armoires sans poignée et éclairage intégré sous les armoires.",
      styleType: "Moderne minimaliste",
      estimatedCost: "25 000 $ — 45 000 $",
      features: ["Îlot central", "Armoires sans poignée", "Éclairage LED intégré", "Comptoir en quartz"],
    },
    "salle de bain": {
      description: "Salle de bain contemporaine avec douche à l'italienne, vanité flottante et carrelage grand format.",
      styleType: "Contemporain épuré",
      estimatedCost: "15 000 $ — 28 000 $",
      features: ["Douche à l'italienne", "Vanité flottante", "Carrelage grand format", "Robinetterie noir mat"],
    },
  };

  return projections[roomType] || {
    description: "Transformation moderne de votre espace avec finitions premium.",
    styleType: "Moderne",
    estimatedCost: null,
    features: ["Design personnalisé", "Matériaux de qualité", "Finitions soignées"],
  };
}
