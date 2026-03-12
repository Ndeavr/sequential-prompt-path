/**
 * UNPRO — DNA Engine
 * Derives behavioral DNA profiles from CCAI answers,
 * classifies actor types, and computes DNA Fit between homeowner/contractor.
 */

import type { CCAIAnswer } from "./ccaiEngine";

// ─── Types ───

export type DNATraitKey =
  | "involvement"
  | "budgetSensitivity"
  | "speedPriority"
  | "qualityPriority"
  | "communicationDetail"
  | "autonomyPreference"
  | "cleanlinessExpectation"
  | "documentationPreference"
  | "noiseTolerance"
  | "friendlinessPreference";

export type HomeownerDNAType =
  | "strategist"
  | "delegator"
  | "budget_guardian"
  | "speed_seeker"
  | "quality_first_owner"
  | "low_friction_owner";

export type ContractorDNAType =
  | "premium_craftsman"
  | "structured_operator"
  | "fast_executor"
  | "technical_specialist"
  | "relationship_builder"
  | "budget_optimizer";

export interface DNAProfile {
  dnaType: string;
  dnaLabelFr: string;
  dnaLabelEn: string;
  traits: Record<DNATraitKey, number>;
  confidence: number;
}

export interface DNAFitResult {
  homeownerType: HomeownerDNAType;
  contractorType: ContractorDNAType;
  dnaFitScore: number;
  compatibilityLabel: "very_high" | "high" | "moderate" | "low";
  matchingTraitsFr: string[];
  watchoutTraitsFr: string[];
  explanationFr: string;
}

export type ActorKind = "homeowner" | "contractor";

// ─── Trait Labels (FR) ───

const TRAIT_LABELS_FR: Record<DNATraitKey, string> = {
  involvement: "niveau d'implication",
  budgetSensitivity: "sensibilité au budget",
  speedPriority: "priorité à la rapidité",
  qualityPriority: "priorité à la qualité",
  communicationDetail: "niveau de détail en communication",
  autonomyPreference: "préférence d'autonomie",
  cleanlinessExpectation: "attente de propreté",
  documentationPreference: "préférence documentaire",
  noiseTolerance: "tolérance au bruit",
  friendlinessPreference: "style relationnel",
};

// ─── Helpers ───

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / Math.max(values.length, 1);
}

function baseTraits(): Record<DNATraitKey, number> {
  return {
    involvement: 50,
    budgetSensitivity: 50,
    speedPriority: 50,
    qualityPriority: 50,
    communicationDetail: 50,
    autonomyPreference: 50,
    cleanlinessExpectation: 50,
    documentationPreference: 50,
    noiseTolerance: 50,
    friendlinessPreference: 50,
  };
}

// ─── 1. Derive traits from CCAI answers ───

export function deriveTraitsFromCCAI(
  answers: CCAIAnswer[],
  actorKind: ActorKind
): Record<DNATraitKey, number> {
  const traits = baseTraits();

  for (const a of answers) {
    switch (a.questionCode) {
      case "client_role":
        if (a.answerCode === "A") traits.involvement -= 30;
        if (a.answerCode === "B") traits.involvement += 30;
        break;
      case "minor_field_decisions":
        if (a.answerCode === "A") traits.autonomyPreference += 30;
        if (a.answerCode === "B") traits.autonomyPreference -= 30;
        if (a.answerCode === "C") { traits.autonomyPreference -= 5; traits.documentationPreference += 15; }
        break;
      case "mid_project_changes":
        if (a.answerCode === "A") traits.documentationPreference -= 25;
        if (a.answerCode === "B") traits.documentationPreference += 25;
        break;
      case "daily_cleanup_expectation":
        if (a.answerCode === "A") traits.cleanlinessExpectation -= 25;
        if (a.answerCode === "B") traits.cleanlinessExpectation += 25;
        break;
      case "noise_tolerance":
        if (a.answerCode === "A") traits.noiseTolerance += 25;
        if (a.answerCode === "B") traits.noiseTolerance -= 25;
        break;
      case "priority":
        if (a.answerCode === "A") traits.budgetSensitivity += 30;
        if (a.answerCode === "B") traits.qualityPriority += 30;
        if (a.answerCode === "C") traits.speedPriority += 30;
        break;
      case "hidden_issue_response":
        if (a.answerCode === "A") traits.qualityPriority += 20;
        if (a.answerCode === "B") traits.budgetSensitivity += 20;
        break;
      case "quick_updates_language":
      case "misunderstood_technical_terms":
      case "group_meeting_language":
        traits.communicationDetail += 10;
        break;
      case "relationship_style":
        if (a.answerCode === "A") traits.friendlinessPreference -= 20;
        if (a.answerCode === "B") traits.friendlinessPreference += 20;
        break;
      case "after_hours_contact":
        if (a.answerCode === "A") traits.friendlinessPreference += 10;
        if (a.answerCode === "C") traits.documentationPreference += 10;
        break;
      case "payment_schedule":
        if (a.answerCode === "A") traits.documentationPreference += 10;
        else traits.budgetSensitivity += 10;
        break;
      case "occupied_home":
        if (actorKind === "homeowner" && a.answerCode === "B") {
          traits.cleanlinessExpectation += 15;
          traits.communicationDetail += 10;
        }
        break;
    }
  }

  return Object.fromEntries(
    Object.entries(traits).map(([k, v]) => [k, clamp(v)])
  ) as Record<DNATraitKey, number>;
}

// ─── 2. Classify DNA type ───

export function classifyHomeownerDNA(
  traits: Record<DNATraitKey, number>
): { dnaType: HomeownerDNAType; dnaLabelFr: string; dnaLabelEn: string } {
  if (traits.involvement >= 75 && traits.communicationDetail >= 70)
    return { dnaType: "strategist", dnaLabelFr: "Stratège", dnaLabelEn: "Strategist" };
  if (traits.involvement <= 35 && traits.autonomyPreference >= 65)
    return { dnaType: "delegator", dnaLabelFr: "Délégateur", dnaLabelEn: "Delegator" };
  if (traits.budgetSensitivity >= 75)
    return { dnaType: "budget_guardian", dnaLabelFr: "Gardien du budget", dnaLabelEn: "Budget Guardian" };
  if (traits.speedPriority >= 75)
    return { dnaType: "speed_seeker", dnaLabelFr: "Chercheur de rapidité", dnaLabelEn: "Speed Seeker" };
  if (traits.qualityPriority >= 75)
    return { dnaType: "quality_first_owner", dnaLabelFr: "Qualité avant tout", dnaLabelEn: "Quality First Owner" };
  return { dnaType: "low_friction_owner", dnaLabelFr: "Propriétaire à faible friction", dnaLabelEn: "Low-Friction Owner" };
}

export function classifyContractorDNA(
  traits: Record<DNATraitKey, number>
): { dnaType: ContractorDNAType; dnaLabelFr: string; dnaLabelEn: string } {
  if (traits.qualityPriority >= 75 && traits.cleanlinessExpectation >= 65)
    return { dnaType: "premium_craftsman", dnaLabelFr: "Artisan premium", dnaLabelEn: "Premium Craftsman" };
  if (traits.documentationPreference >= 70 && traits.communicationDetail >= 65)
    return { dnaType: "structured_operator", dnaLabelFr: "Opérateur structuré", dnaLabelEn: "Structured Operator" };
  if (traits.speedPriority >= 75 && traits.autonomyPreference >= 65)
    return { dnaType: "fast_executor", dnaLabelFr: "Exécutant rapide", dnaLabelEn: "Fast Executor" };
  if (traits.qualityPriority >= 70 && traits.communicationDetail >= 70)
    return { dnaType: "technical_specialist", dnaLabelFr: "Spécialiste technique", dnaLabelEn: "Technical Specialist" };
  if (traits.friendlinessPreference >= 70 && traits.communicationDetail >= 60)
    return { dnaType: "relationship_builder", dnaLabelFr: "Bâtisseur de relation", dnaLabelEn: "Relationship Builder" };
  return { dnaType: "budget_optimizer", dnaLabelFr: "Optimiseur budget", dnaLabelEn: "Budget Optimizer" };
}

// ─── 3. DNA Confidence ───

export function estimateDNAConfidence(answersCount: number, traitVarianceProxy: number): number {
  const countFactor = Math.min(1, answersCount / 25) * 70;
  const coherenceFactor = Math.max(0, 30 - traitVarianceProxy / 4);
  return clamp(countFactor + coherenceFactor);
}

// ─── 4. DNA Fit comparison ───

export function computeDNAFit(
  homeowner: DNAProfile,
  contractor: DNAProfile
): DNAFitResult {
  const traitKeys = Object.keys(homeowner.traits) as DNATraitKey[];
  const distances = traitKeys.map((k) => Math.abs(homeowner.traits[k] - contractor.traits[k]));
  const avgDistance = average(distances);
  const dnaFitScore = clamp(100 - avgDistance);

  const matchingTraitsFr: string[] = [];
  const watchoutTraitsFr: string[] = [];

  for (const key of traitKeys) {
    const diff = Math.abs(homeowner.traits[key] - contractor.traits[key]);
    if (diff <= 12) matchingTraitsFr.push(TRAIT_LABELS_FR[key]);
    if (diff >= 30) watchoutTraitsFr.push(TRAIT_LABELS_FR[key]);
  }

  let compatibilityLabel: DNAFitResult["compatibilityLabel"];
  if (dnaFitScore >= 85) compatibilityLabel = "very_high";
  else if (dnaFitScore >= 72) compatibilityLabel = "high";
  else if (dnaFitScore >= 58) compatibilityLabel = "moderate";
  else compatibilityLabel = "low";

  const explanations: Record<DNAFitResult["compatibilityLabel"], string> = {
    very_high: "Très forte compatibilité comportementale entre le propriétaire et l'entrepreneur.",
    high: "Bonne compatibilité de style de travail, avec peu de friction attendue.",
    moderate: "Compatibilité moyenne. Quelques ajustements de communication ou de gestion seront utiles.",
    low: "Compatibilité faible. Le style de travail et les attentes risquent de créer de la friction.",
  };

  return {
    homeownerType: homeowner.dnaType as HomeownerDNAType,
    contractorType: contractor.dnaType as ContractorDNAType,
    dnaFitScore,
    compatibilityLabel,
    matchingTraitsFr: matchingTraitsFr.slice(0, 5),
    watchoutTraitsFr: watchoutTraitsFr.slice(0, 5),
    explanationFr: explanations[compatibilityLabel],
  };
}

// ─── 5. Full pipeline: CCAI answers → DNA Profile ───

export function buildHomeownerDNAFromCCAI(answers: CCAIAnswer[]): DNAProfile {
  const traits = deriveTraitsFromCCAI(answers, "homeowner");
  const classification = classifyHomeownerDNA(traits);
  return {
    dnaType: classification.dnaType,
    dnaLabelFr: classification.dnaLabelFr,
    dnaLabelEn: classification.dnaLabelEn,
    traits,
    confidence: estimateDNAConfidence(answers.length, 18),
  };
}

export function buildContractorDNAFromCCAI(answers: CCAIAnswer[]): DNAProfile {
  const traits = deriveTraitsFromCCAI(answers, "contractor");
  const classification = classifyContractorDNA(traits);
  return {
    dnaType: classification.dnaType,
    dnaLabelFr: classification.dnaLabelFr,
    dnaLabelEn: classification.dnaLabelEn,
    traits,
    confidence: estimateDNAConfidence(answers.length, 18),
  };
}
