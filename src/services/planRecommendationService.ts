/**
 * UNPRO — Deterministic Plan Recommendation Engine
 */
import type { RecommendedPlan, PlanGoal } from "@/types/outreachFunnel";

interface RecommendationInput {
  aippScore: number | null;
  confidenceLevel: "low" | "medium" | "high";
  goal: PlanGoal;
  monthlyAppointmentGoal?: number;
  averageJobValue?: number;
  serviceAreaCount?: number;
}

export function recommendPlan(input: RecommendationInput): RecommendedPlan {
  const score = input.aippScore ?? 0;
  const apptGoal = input.monthlyAppointmentGoal ?? 0;
  const avgJob = input.averageJobValue ?? 0;
  const serviceAreas = input.serviceAreaCount ?? 1;

  if (apptGoal >= 40 || avgJob >= 10000 || serviceAreas >= 4 || input.goal === "territory") {
    return "signature";
  }
  if (apptGoal >= 20 || avgJob >= 5000 || input.goal === "appointments") {
    return "elite";
  }
  if (score >= 60 || apptGoal >= 10 || serviceAreas >= 2) {
    return "premium";
  }
  if (score >= 35 || input.goal === "ai_presence" || input.goal === "conversion") {
    return "pro";
  }
  return "recrue";
}

export function getPlanLabel(plan: RecommendedPlan): string {
  const labels: Record<RecommendedPlan, string> = {
    recrue: "Recrue",
    pro: "Pro",
    premium: "Premium",
    elite: "Élite",
    signature: "Signature",
  };
  return labels[plan];
}

export function getRecommendationReasons(plan: RecommendedPlan, score: number | null): string[] {
  const reasons: Record<RecommendedPlan, string[]> = {
    recrue: [
      "Votre présence numérique est encore à construire",
      "Ce plan vous donne les bases pour démarrer",
      "Activation rapide sans engagement lourd",
    ],
    pro: [
      "Votre visibilité IA est encore faible",
      "Ce plan corrige vos blocages fondamentaux",
      "Vous avez le potentiel pour une montée rapide",
    ],
    premium: [
      "Votre base actuelle permet déjà une montée rapide",
      "Vous avez le potentiel pour absorber plus de rendez-vous",
      "Ce plan maximise votre retour sur investissement",
    ],
    elite: [
      "Votre ambition mérite un niveau d'activation supérieur",
      "Ce plan vous donne la domination locale",
      "Vous pouvez absorber un volume élevé de rendez-vous",
    ],
    signature: [
      "Vous visez la domination de votre territoire",
      "Ce plan verrouille votre position de leader",
      "Volume maximal de rendez-vous qualifiés",
    ],
  };
  return reasons[plan];
}

export function computeSniperPriority(input: {
  hasWebsite: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  categoryValueTier: "low" | "medium" | "high";
  territoryDemandTier: "low" | "medium" | "high";
  likelyAippWeakness: "low" | "medium" | "high";
  founderEligible: boolean;
  supplyNeedTier: "low" | "medium" | "high";
}): number {
  let score = 0;

  // Revenue potential /25
  if (input.categoryValueTier === "high") score += 13;
  else if (input.categoryValueTier === "medium") score += 8;
  else score += 4;

  if (input.territoryDemandTier === "high") score += 12;
  else if (input.territoryDemandTier === "medium") score += 7;
  else score += 3;

  // Readiness /15
  if (input.hasWebsite) score += 6;
  if (input.hasPhone) score += 4;
  if (input.hasEmail) score += 5;

  // Pain / upside /25
  if (input.likelyAippWeakness === "high") score += 25;
  else if (input.likelyAippWeakness === "medium") score += 15;
  else score += 6;

  // Strategic fit /20
  if (input.founderEligible) score += 10;
  if (input.supplyNeedTier === "high") score += 10;
  else if (input.supplyNeedTier === "medium") score += 6;
  else score += 2;

  return Math.min(score, 100);
}

export function getHeatLabel(heat: number): { label: string; color: string } {
  if (heat >= 70) return { label: "Close now", color: "text-red-400" };
  if (heat >= 40) return { label: "Hot", color: "text-orange-400" };
  if (heat >= 20) return { label: "Warm", color: "text-yellow-400" };
  return { label: "Cold", color: "text-muted-foreground" };
}
