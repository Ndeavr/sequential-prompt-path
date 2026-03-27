/**
 * AlexEntrepreneurGuidanceEngine — Guides entrepreneurs through
 * diagnostic, revenue projection, plan recommendation, profile building, and activation.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export type EntrepreneurSituation = "startup" | "growth" | "saturation" | "pivot";

export interface EntrepreneurDiagnostic {
  serviceType: string;
  serviceZone: string;
  annualRevenueTarget: number;
  currentSituation: EntrepreneurSituation;
  monthlyCapacity: number;
  avgProjectValue?: number;
}

export interface RevenueProjection {
  annualTarget: number;
  avgProjectValue: number;
  estimatedMarginPct: number;
  rdvNeededAnnual: number;
  rdvNeededMonthly: number;
  recommendedPlan: string;
}

export type PlanTier = "recrue" | "pro" | "premium" | "elite" | "signature";

export interface PlanRecommendation {
  plan: PlanTier;
  reasoning: string;
  monthlyPrice: number;
  features: string[];
  confidence: number;
}

// ─── Plan definitions ───

const PLANS: Record<PlanTier, { price: number; label: string; features: string[]; maxRdvMonth: number }> = {
  recrue:    { price: 0,   label: "Recrue",    features: ["Projets S/M", "Profil de base", "Visibilité locale"], maxRdvMonth: 3 },
  pro:       { price: 49,  label: "Pro",       features: ["Projets S/M/L", "Score AIPP", "Badge vérifié", "Support prioritaire"], maxRdvMonth: 8 },
  premium:   { price: 99,  label: "Premium",   features: ["Projets XL inclus", "Auto-acceptation", "Analytics avancés", "Priorité matching"], maxRdvMonth: 15 },
  elite:     { price: 199, label: "Élite",     features: ["Toutes classes dont XXL", "Analytics prioritaires", "Account manager", "Boosts inclus"], maxRdvMonth: 25 },
  signature: { price: 399, label: "Signature", features: ["Priorité maximale", "Exclusivité territoriale", "Concierge dédié", "Formation IA"], maxRdvMonth: 30 },
};

// ─── Revenue projection ───

export function computeRevenueProjection(diagnostic: EntrepreneurDiagnostic): RevenueProjection {
  const avgValue = diagnostic.avgProjectValue || estimateAvgProjectValue(diagnostic.serviceType);
  const marginPct = 30;
  const rdvAnnual = Math.ceil(diagnostic.annualRevenueTarget / avgValue);
  const rdvMonthly = Math.ceil(rdvAnnual / 12);
  const plan = recommendPlanFromRdv(rdvMonthly, diagnostic.currentSituation);

  return {
    annualTarget: diagnostic.annualRevenueTarget,
    avgProjectValue: avgValue,
    estimatedMarginPct: marginPct,
    rdvNeededAnnual: rdvAnnual,
    rdvNeededMonthly: rdvMonthly,
    recommendedPlan: plan,
  };
}

function estimateAvgProjectValue(serviceType: string): number {
  const estimates: Record<string, number> = {
    toiture: 8000, plomberie: 2500, electricite: 3000, renovation_cuisine: 15000,
    renovation_sdb: 10000, peinture: 2000, amenagement: 5000, demenagement: 1500,
    inspection: 600, notaire: 1200, paysagement: 3500, fenetre: 6000,
  };
  return estimates[serviceType.toLowerCase()] || 3000;
}

function recommendPlanFromRdv(rdvMonthly: number, situation: EntrepreneurSituation): PlanTier {
  if (situation === "saturation") return "elite";
  if (rdvMonthly <= 3) return "recrue";
  if (rdvMonthly <= 8) return "pro";
  if (rdvMonthly <= 15) return "premium";
  if (rdvMonthly <= 25) return "elite";
  return "signature";
}

// ─── Plan recommendation ───

export function getFullPlanRecommendation(
  projection: RevenueProjection,
  situation: EntrepreneurSituation
): PlanRecommendation {
  const planKey = projection.recommendedPlan as PlanTier;
  const plan = PLANS[planKey];

  const reasoningMap: Record<PlanTier, string> = {
    recrue: "Parfait pour commencer sans engagement. Vous testez la plateforme à votre rythme.",
    pro: "Le meilleur équilibre pour démarrer sérieusement sans exploser votre budget.",
    premium: "Vous visez la croissance — ce plan vous donne les outils pour accélérer.",
    elite: "Vous jouez pour dominer votre marché. Ce plan vous met en pole position.",
    signature: "Exclusivité territoriale + concierge dédié. Vous devenez LA référence de votre zone.",
  };

  return {
    plan: planKey,
    reasoning: reasoningMap[planKey],
    monthlyPrice: plan.price,
    features: plan.features,
    confidence: situation === "startup" ? 0.75 : 0.88,
  };
}

export function getPlanDetails(tier: PlanTier) {
  return { tier, ...PLANS[tier] };
}

export function getAllPlans() {
  return Object.entries(PLANS).map(([key, val]) => ({ tier: key as PlanTier, ...val }));
}

// ─── Persistence helpers ───

export async function saveEntrepreneurGoal(userId: string, diagnostic: EntrepreneurDiagnostic) {
  return supabase.from("entrepreneur_goals").upsert({
    user_id: userId,
    service_type: diagnostic.serviceType,
    service_zone: diagnostic.serviceZone,
    annual_revenue_target: diagnostic.annualRevenueTarget,
    current_situation: diagnostic.currentSituation,
    monthly_capacity: diagnostic.monthlyCapacity,
    avg_project_value: diagnostic.avgProjectValue || estimateAvgProjectValue(diagnostic.serviceType),
  }, { onConflict: "user_id" }).select().single();
}

export async function savePlanRecommendation(userId: string, rec: PlanRecommendation, rdvMonthly: number, projectedRevenue: number) {
  return supabase.from("entrepreneur_plan_recommendations").insert({
    user_id: userId,
    recommended_plan: rec.plan,
    reasoning: rec.reasoning,
    monthly_rdv_needed: rdvMonthly,
    projected_revenue: projectedRevenue,
    confidence_score: rec.confidence,
  }).select().single();
}

export async function saveRevenueProjection(userId: string, goalId: string, proj: RevenueProjection) {
  return supabase.from("entrepreneur_revenue_projections").insert({
    user_id: userId,
    goal_id: goalId,
    annual_target: proj.annualTarget,
    avg_project_value: proj.avgProjectValue,
    estimated_margin_pct: proj.estimatedMarginPct,
    rdv_needed_annual: proj.rdvNeededAnnual,
    rdv_needed_monthly: proj.rdvNeededMonthly,
    recommended_plan: proj.recommendedPlan,
  }).select().single();
}

// ─── Profile progress ───

const PROFILE_STEPS = [
  { code: "business_info", label: "Informations entreprise" },
  { code: "services", label: "Services offerts" },
  { code: "territory", label: "Territoire desservi" },
  { code: "photos", label: "Photos de projets" },
  { code: "certifications", label: "Certifications et licences" },
  { code: "rbq_neq", label: "RBQ / NEQ" },
  { code: "reviews_import", label: "Importation des avis" },
  { code: "specializations", label: "Spécialisations" },
];

export function getProfileSteps() {
  return PROFILE_STEPS;
}

export async function initProfileProgress(userId: string) {
  const rows = PROFILE_STEPS.map((step, i) => ({
    user_id: userId,
    step_code: step.code,
    step_label: step.label,
    status: "pending",
    sort_order: i,
  }));
  return supabase.from("entrepreneur_profile_progress").insert(rows);
}

export async function updateProfileStep(userId: string, stepCode: string, status: "pending" | "in_progress" | "completed") {
  return supabase.from("entrepreneur_profile_progress")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("step_code", stepCode);
}

export async function getProfileProgress(userId: string) {
  const { data } = await supabase.from("entrepreneur_profile_progress")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order");
  return data || [];
}

// ─── AIPP improvement suggestions ───

export function getAIPPImprovementSuggestions(currentScore: number, completedSteps: string[]): string[] {
  const suggestions: string[] = [];
  if (!completedSteps.includes("photos")) suggestions.push("Ajoutez au moins 5 photos de projets récents");
  if (!completedSteps.includes("certifications")) suggestions.push("Importez vos certifications et licences");
  if (!completedSteps.includes("rbq_neq")) suggestions.push("Ajoutez votre numéro RBQ ou NEQ");
  if (!completedSteps.includes("reviews_import")) suggestions.push("Connectez vos avis Google");
  if (!completedSteps.includes("specializations")) suggestions.push("Précisez vos spécialisations");
  if (currentScore < 60) suggestions.push("Complétez votre description d'entreprise");
  return suggestions;
}

// ─── Role detection signals ───

export const ENTREPRENEUR_SIGNALS = [
  "je veux des contrats",
  "je suis entrepreneur",
  "je veux m'inscrire",
  "combien ça coûte",
  "leads",
  "rendez-vous",
  "plus de clients",
  "visibilité",
  "mon entreprise",
  "plan pro",
  "plan premium",
  "signature",
  "soumissions",
  "mon profil",
];

export function detectEntrepreneurIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return ENTREPRENEUR_SIGNALS.some(s => lower.includes(s));
}
