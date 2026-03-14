/**
 * UNPRO — Home Score Service (V2)
 * Extended deterministic scoring engine with confidence levels, score types, and factor breakdown.
 * 
 * Score types:
 * - "estimated" — based on public/minimal data only
 * - "enriched" — owner has added significant passport data
 * - "certified" — future: post-inspection verified
 */

import { scoringWeights } from "@/config/scoringWeights";
import { supabase } from "@/integrations/supabase/client";

export interface HomeScoreInput {
  yearBuilt?: number | null;
  propertyType?: string | null;
  squareFootage?: number | null;
  condition?: string | null;
  hasInspectionReports: boolean;
  uploadedDocumentCount: number;
  quoteCount: number;
  renovationCount: number;
  recentRepairCount: number;
  // V2 — enriched data from passport
  heatingType?: string | null;
  roofYear?: number | null;
  windowsYear?: number | null;
  insulationType?: string | null;
  foundationType?: string | null;
  plumbingYear?: number | null;
  passportCompletionPct?: number;
}

export interface ScoreFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  confidence: "high" | "medium" | "low";
  missingData?: string;
  improvementTip?: string;
}

export interface HomeScoreOutput {
  overall: number;
  structure: number;
  systems: number;
  exterior: number;
  interior: number;
  maintenance: number;
  label: string;
  color: string;
  scoreType: "estimated" | "enriched" | "certified";
  confidenceLevel: number; // 0-100
  confidenceLabel: string;
  factors: ScoreFactor[];
}

const currentYear = new Date().getFullYear();

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function ageScore(yearBuilt?: number | null): number {
  if (!yearBuilt) return 50;
  const age = currentYear - yearBuilt;
  if (age <= 5) return 95;
  if (age <= 15) return 85;
  if (age <= 30) return 70;
  if (age <= 50) return 55;
  if (age <= 80) return 40;
  return 25;
}

function conditionBonus(condition?: string | null): number {
  switch (condition) {
    case "excellent": return 15;
    case "good": return 8;
    case "fair": return 0;
    case "poor": return -10;
    case "critical": return -20;
    default: return 0;
  }
}

function componentAgeScore(year?: number | null, typicalLifespan = 25): number {
  if (!year) return 50;
  const age = currentYear - year;
  const ratio = age / typicalLifespan;
  if (ratio <= 0.3) return 95;
  if (ratio <= 0.6) return 75;
  if (ratio <= 0.85) return 55;
  if (ratio <= 1.0) return 35;
  return 20;
}

function docScore(input: HomeScoreInput): number {
  let score = 40;
  if (input.hasInspectionReports) score += 25;
  score += Math.min(input.uploadedDocumentCount * 5, 20);
  score += Math.min(input.quoteCount * 5, 15);
  return clamp(score);
}

/**
 * Calculate confidence based on available data points.
 */
function calculateConfidence(input: HomeScoreInput): { level: number; label: string } {
  let points = 0;
  const checks = [
    input.yearBuilt != null,
    input.propertyType != null,
    input.squareFootage != null,
    input.condition != null,
    input.hasInspectionReports,
    input.uploadedDocumentCount > 0,
    input.renovationCount > 0,
    input.heatingType != null,
    input.roofYear != null,
    input.windowsYear != null,
    input.insulationType != null,
    input.foundationType != null,
    input.plumbingYear != null,
  ];
  checks.forEach((c) => { if (c) points++; });
  const level = Math.round((points / checks.length) * 100);
  const label = level >= 70 ? "élevée" : level >= 40 ? "moyenne" : "faible";
  return { level, label };
}

function determineScoreType(input: HomeScoreInput): "estimated" | "enriched" | "certified" {
  if (input.passportCompletionPct && input.passportCompletionPct >= 70) return "enriched";
  const confidence = calculateConfidence(input);
  if (confidence.level >= 50) return "enriched";
  return "estimated";
}

export function calculateHomeScore(input: HomeScoreInput): HomeScoreOutput {
  const base = ageScore(input.yearBuilt);
  const cBonus = conditionBonus(input.condition);
  const renovBonus = Math.min(input.renovationCount * 5, 15);
  const repairBonus = Math.min(input.recentRepairCount * 3, 10);

  // V2 — use component data if available
  const roofScore = input.roofYear ? componentAgeScore(input.roofYear, 25) : base + cBonus - 3;
  const windowScore = input.windowsYear ? componentAgeScore(input.windowsYear, 30) : base + cBonus - 5;

  const structure = clamp(base + cBonus + renovBonus);
  const systems = clamp(
    input.plumbingYear
      ? (componentAgeScore(input.plumbingYear, 40) + base + cBonus) / 2 + repairBonus
      : base + cBonus + repairBonus - 5
  );
  const exterior = clamp((roofScore + windowScore) / 2 + renovBonus * 0.3);
  const interior = clamp(base + cBonus + repairBonus * 0.5);
  const maintenance = docScore(input);

  const weights = scoringWeights.homeScore;
  const overall = clamp(Math.round(
    structure * weights.structure +
    systems * weights.systems +
    exterior * weights.exterior +
    interior * weights.interior +
    maintenance * weights.maintenance
  ));

  const confidence = calculateConfidence(input);
  const scoreType = determineScoreType(input);

  // Build factor breakdown
  const factors: ScoreFactor[] = [
    {
      key: "structure",
      label: "Structure",
      score: Math.round(structure),
      weight: weights.structure,
      confidence: input.yearBuilt && input.condition ? "high" : input.yearBuilt ? "medium" : "low",
      missingData: !input.yearBuilt ? "Année de construction manquante" : !input.foundationType ? "Type de fondation inconnu" : undefined,
      improvementTip: input.condition === "poor" ? "Documentez l'état de votre fondation pour préciser le score" : undefined,
    },
    {
      key: "systems",
      label: "Systèmes",
      score: Math.round(systems),
      weight: weights.systems,
      confidence: input.heatingType && input.plumbingYear ? "high" : input.heatingType || input.plumbingYear ? "medium" : "low",
      missingData: !input.heatingType ? "Type de chauffage manquant" : !input.plumbingYear ? "Année de plomberie manquante" : undefined,
      improvementTip: "Ajoutez les détails de vos systèmes mécaniques",
    },
    {
      key: "exterior",
      label: "Extérieur",
      score: Math.round(exterior),
      weight: weights.exterior,
      confidence: input.roofYear && input.windowsYear ? "high" : input.roofYear || input.windowsYear ? "medium" : "low",
      missingData: !input.roofYear ? "Année du toit manquante" : !input.windowsYear ? "Année des fenêtres manquante" : undefined,
      improvementTip: "Précisez l'année de votre toiture et de vos fenêtres",
    },
    {
      key: "interior",
      label: "Intérieur",
      score: Math.round(interior),
      weight: weights.interior,
      confidence: input.renovationCount > 0 ? "medium" : "low",
      missingData: input.renovationCount === 0 ? "Aucune rénovation documentée" : undefined,
      improvementTip: "Documentez vos rénovations intérieures",
    },
    {
      key: "maintenance",
      label: "Documentation",
      score: Math.round(maintenance),
      weight: weights.maintenance,
      confidence: input.hasInspectionReports ? "high" : input.uploadedDocumentCount > 0 ? "medium" : "low",
      missingData: !input.hasInspectionReports ? "Aucun rapport d'inspection" : undefined,
      improvementTip: "Téléversez vos factures et rapports d'inspection",
    },
  ];

  return {
    overall,
    structure: Math.round(structure),
    systems: Math.round(systems),
    exterior: Math.round(exterior),
    interior: Math.round(interior),
    maintenance: Math.round(maintenance),
    label: getLabel(overall),
    color: getColor(overall),
    scoreType,
    confidenceLevel: confidence.level,
    confidenceLabel: confidence.label,
    factors,
  };
}

/**
 * Save a score snapshot to the database.
 */
export async function saveScoreSnapshot(
  propertyId: string,
  userId: string,
  score: HomeScoreOutput
) {
  const { data, error } = await supabase
    .from("home_scores")
    .insert([{
      property_id: propertyId,
      user_id: userId,
      overall_score: score.overall,
      structure_score: score.structure,
      systems_score: score.systems,
      exterior_score: score.exterior,
      interior_score: score.interior,
      maintenance_score: score.maintenance,
      score_type: score.scoreType,
      confidence_level: score.confidenceLevel,
      confidence_label: score.confidenceLabel,
      factor_breakdown: score.factors as any,
      data_sources_count: score.factors.filter((f) => f.confidence !== "low").length,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get score history for a property.
 */
export async function getScoreHistory(propertyId: string) {
  const { data, error } = await supabase
    .from("home_scores")
    .select("*")
    .eq("property_id", propertyId)
    .order("calculated_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

function getLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Bon";
  if (score >= 40) return "À surveiller";
  return "Priorité haute";
}

function getColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-accent";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}

export function getScoreTypeLabel(type: string): { label: string; description: string } {
  switch (type) {
    case "estimated": return { label: "Score estimé", description: "Basé sur les informations publiques disponibles" };
    case "enriched": return { label: "Score enrichi", description: "Basé sur les données du propriétaire" };
    case "certified": return { label: "Score certifié", description: "Vérifié par un inspecteur professionnel" };
    default: return { label: "Score estimé", description: "Basé sur les informations disponibles" };
  }
}
