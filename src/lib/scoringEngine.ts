/**
 * UNPRO — Scoring Engine
 * Utility functions for score calculations.
 *
 * Future: weighted scoring, normalization, trend calculation.
 */

import { scoringWeights } from "@/config/scoringWeights";

export const calculateWeightedScore = (
  values: Record<string, number>,
  weights: Record<string, number>
): number => {
  let total = 0;
  let weightSum = 0;
  for (const key of Object.keys(weights)) {
    if (values[key] !== undefined) {
      total += values[key] * weights[key];
      weightSum += weights[key];
    }
  }
  return weightSum > 0 ? Math.round((total / weightSum) * 100) / 100 : 0;
};

export const getScoreLabel = (score: number): string => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Poor";
  return "Critical";
};

export const getScoreColor = (score: number): string => {
  if (score >= 90) return "text-green-600";
  if (score >= 75) return "text-blue-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
};
