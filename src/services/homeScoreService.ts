/**
 * UNPRO — Home Score Service
 * Deterministic scoring engine for property condition assessment.
 */

import { scoringWeights } from "@/config/scoringWeights";

export interface HomeScoreInput {
  yearBuilt?: number | null;
  propertyType?: string | null;
  squareFootage?: number | null;
  condition?: string | null;
  // Document indicators
  hasInspectionReports: boolean;
  uploadedDocumentCount: number;
  quoteCount: number;
  // Event/renovation history
  renovationCount: number;
  recentRepairCount: number;
}

export interface HomeScoreOutput {
  overall: number;
  structure: number;
  systems: number;
  exterior: number;
  interior: number;
  label: string;
  color: string;
}

const currentYear = new Date().getFullYear();

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function ageScore(yearBuilt?: number | null): number {
  if (!yearBuilt) return 50; // neutral
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

function docScore(input: HomeScoreInput): number {
  let score = 40; // baseline
  if (input.hasInspectionReports) score += 25;
  score += Math.min(input.uploadedDocumentCount * 5, 20);
  score += Math.min(input.quoteCount * 5, 15);
  return clamp(score);
}

export function calculateHomeScore(input: HomeScoreInput): HomeScoreOutput {
  const base = ageScore(input.yearBuilt);
  const cBonus = conditionBonus(input.condition);
  const renovBonus = Math.min(input.renovationCount * 5, 15);
  const repairBonus = Math.min(input.recentRepairCount * 3, 10);

  const structure = clamp(base + cBonus + renovBonus);
  const systems = clamp(base + cBonus + repairBonus - 5);
  const exterior = clamp(base + cBonus - 3 + renovBonus * 0.5);
  const interior = clamp(base + cBonus + repairBonus * 0.5);
  const documentation = docScore(input);

  const weights = scoringWeights.homeScore;
  const overall = clamp(Math.round(
    structure * weights.structure +
    systems * weights.systems +
    exterior * weights.exterior +
    interior * weights.interior +
    documentation * weights.maintenance
  ));

  return {
    overall,
    structure: Math.round(structure),
    systems: Math.round(systems),
    exterior: Math.round(exterior),
    interior: Math.round(interior),
    label: getLabel(overall),
    color: getColor(overall),
  };
}

function getLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Bon";
  if (score >= 40) return "À surveiller";
  return "Priorité haute";
}

function getColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}
