/**
 * EngineAutoProjectSizingAI
 * Classifie automatiquement la taille d'un projet (XS→XXL) via IA
 * basé sur la description, le budget estimé et les signaux contextuels.
 */

import type { ProjectSizeCode } from "./clusterProjectSizeMatrixEngine";

export interface SizingInput {
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetEstimated?: number;
  propertyType?: string;
  roomCount?: number;
  squareFootage?: number;
}

export interface SizingResult {
  classifiedSize: ProjectSizeCode;
  confidence: number;
  reasoning: string;
  alternativeSize?: ProjectSizeCode;
  alternativeConfidence?: number;
}

// Budget-based classification thresholds
const BUDGET_THRESHOLDS: { code: ProjectSizeCode; min: number; max: number }[] = [
  { code: "xs", min: 0, max: 1000 },
  { code: "s", min: 1000, max: 5000 },
  { code: "m", min: 5000, max: 15000 },
  { code: "l", min: 15000, max: 40000 },
  { code: "xl", min: 40000, max: 100000 },
  { code: "xxl", min: 100000, max: Infinity },
];

// Keyword signals for size classification
const SIZE_KEYWORDS: Record<ProjectSizeCode, string[]> = {
  xs: ["réparation", "repair", "mineur", "minor", "patch", "colmatage", "robinet", "faucet", "joint", "caulk"],
  s: ["isolation", "insulation", "partiel", "partial", "peinture", "paint", "plancher", "floor", "petit"],
  m: ["salle de bain", "bathroom", "cuisine partielle", "fenêtres", "windows", "toiture partielle", "deck"],
  l: ["toiture", "roof", "complète", "complete", "fondation", "foundation", "drainage", "plomberie complète"],
  xl: ["cuisine complète", "full kitchen", "agrandissement", "extension", "sous-sol", "basement", "addition"],
  xxl: ["rénovation complète", "full renovation", "construction", "maison", "house", "duplex", "triplex", "condo complet"],
};

/**
 * Classify project size from budget alone
 */
export function classifyByBudget(budget: number): { size: ProjectSizeCode; confidence: number } {
  for (const t of BUDGET_THRESHOLDS) {
    if (budget >= t.min && budget < t.max) {
      // Higher confidence when budget is in the middle of the range
      const range = Math.min(t.max, 500000) - t.min;
      const position = (budget - t.min) / range;
      const confidence = position > 0.2 && position < 0.8 ? 0.85 : 0.65;
      return { size: t.code, confidence };
    }
  }
  return { size: "m", confidence: 0.3 };
}

/**
 * Classify project size from description keywords
 */
export function classifyByKeywords(description: string): { size: ProjectSizeCode; confidence: number } {
  const lower = description.toLowerCase();
  let bestMatch: ProjectSizeCode = "m";
  let bestScore = 0;

  for (const [size, keywords] of Object.entries(SIZE_KEYWORDS) as [ProjectSizeCode, string[]][]) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = size;
    }
  }

  const confidence = bestScore >= 3 ? 0.9 : bestScore >= 2 ? 0.75 : bestScore >= 1 ? 0.55 : 0.2;
  return { size: bestMatch, confidence };
}

/**
 * Combine multiple signals into a final classification
 */
export function classifyProjectSize(input: SizingInput): SizingResult {
  const signals: { size: ProjectSizeCode; confidence: number; source: string }[] = [];

  // Budget signal
  const budget = input.budgetEstimated ?? ((input.budgetMin ?? 0) + (input.budgetMax ?? 0)) / 2;
  if (budget > 0) {
    const budgetResult = classifyByBudget(budget);
    signals.push({ ...budgetResult, source: "budget" });
  }

  // Keyword signal
  if (input.description) {
    const keywordResult = classifyByKeywords(input.description);
    signals.push({ ...keywordResult, source: "keywords" });
  }

  // Square footage signal
  if (input.squareFootage) {
    const sqft = input.squareFootage;
    let size: ProjectSizeCode = "m";
    if (sqft < 100) size = "xs";
    else if (sqft < 300) size = "s";
    else if (sqft < 800) size = "m";
    else if (sqft < 1500) size = "l";
    else if (sqft < 3000) size = "xl";
    else size = "xxl";
    signals.push({ size, confidence: 0.6, source: "sqft" });
  }

  if (signals.length === 0) {
    return { classifiedSize: "m", confidence: 0.2, reasoning: "Aucun signal disponible — taille M par défaut" };
  }

  // Weighted vote
  const sizeOrder: ProjectSizeCode[] = ["xs", "s", "m", "l", "xl", "xxl"];
  const scores: Record<ProjectSizeCode, number> = { xs: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 };

  for (const s of signals) {
    scores[s.size] += s.confidence;
  }

  const sorted = sizeOrder.sort((a, b) => scores[b] - scores[a]);
  const best = sorted[0];
  const totalWeight = signals.reduce((sum, s) => sum + s.confidence, 0);
  const confidence = Math.min(0.98, scores[best] / totalWeight);

  const reasons = signals.map(s => `${s.source}: ${s.size.toUpperCase()} (${Math.round(s.confidence * 100)}%)`);

  return {
    classifiedSize: best,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: reasons.join(" | "),
    alternativeSize: sorted[1] !== best ? sorted[1] : undefined,
    alternativeConfidence: sorted[1] !== best ? Math.round((scores[sorted[1]] / totalWeight) * 100) / 100 : undefined,
  };
}

/**
 * Quick label for a sizing result
 */
export function getSizingConfidenceLabel(confidence: number): string {
  if (confidence >= 0.85) return "Très haute confiance";
  if (confidence >= 0.7) return "Haute confiance";
  if (confidence >= 0.5) return "Confiance modérée";
  if (confidence >= 0.3) return "Faible confiance";
  return "Estimation approximative";
}

// Mock data for demo
export const MOCK_CLASSIFICATIONS: (SizingInput & SizingResult)[] = [
  {
    description: "Réparation robinet cuisine",
    budgetEstimated: 350,
    classifiedSize: "xs",
    confidence: 0.92,
    reasoning: "budget: XS (85%) | keywords: XS (90%)",
  },
  {
    description: "Isolation complète entretoit bungalow",
    budgetEstimated: 3800,
    classifiedSize: "s",
    confidence: 0.88,
    reasoning: "budget: S (85%) | keywords: S (75%)",
  },
  {
    description: "Rénovation salle de bain complète avec douche walk-in",
    budgetEstimated: 12000,
    classifiedSize: "m",
    confidence: 0.85,
    reasoning: "budget: M (85%) | keywords: M (90%)",
  },
  {
    description: "Remplacement toiture complète bardeaux architecturaux",
    budgetEstimated: 28000,
    classifiedSize: "l",
    confidence: 0.90,
    reasoning: "budget: L (85%) | keywords: L (75%)",
  },
  {
    description: "Cuisine complète avec îlot, armoires sur mesure et comptoir quartz",
    budgetEstimated: 65000,
    classifiedSize: "xl",
    confidence: 0.87,
    reasoning: "budget: XL (85%) | keywords: XL (90%)",
  },
  {
    description: "Rénovation complète maison 3 étages incluant structure, mécanique et finition",
    budgetEstimated: 250000,
    classifiedSize: "xxl",
    confidence: 0.95,
    reasoning: "budget: XXL (85%) | keywords: XXL (90%)",
  },
];
