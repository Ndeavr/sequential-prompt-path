/**
 * Calculator Session — persists calculator results for pricing pre-selection.
 * Uses sessionStorage for anonymous users, Supabase for authenticated.
 */

const SESSION_KEY = "unpro_calculator_session";

export interface CalculatorSession {
  revenueGoal: number;
  city: string;
  category: string;
  specialty: string;
  avgJobValue: number;
  conversionRate: number;
  monthlyCapacity: number;
  projectTypes: string[];
  recommendedPlan: string;
  estimatedAppointments: number;
  estimatedRevenue: number;
  estimatedBudget: number;
  createdAt: string;
}

export function saveCalculatorSession(session: CalculatorSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export function getCalculatorSession(): CalculatorSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCalculatorSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

/**
 * Plan recommendation engine based on calculator inputs.
 * Returns plan_catalog codes (pro_acq | premium_acq | elite_acq).
 */
export function recommendPlan(inputs: {
  revenueGoal: number;
  projectTypes: string[];
  monthlyCapacity: number;
  city?: string;
}): string {
  const { revenueGoal, projectTypes, monthlyCapacity } = inputs;
  const hasXXL = projectTypes.includes("XXL");
  const hasXL = projectTypes.includes("XL");

  // Élite: XXL access, very high revenue or saturated capacity
  if (hasXXL || revenueGoal >= 25000 || monthlyCapacity >= 20) return "elite_acq";
  // Premium (featured): XL access or ambitious goals
  if (hasXL || revenueGoal >= 12000) return "premium_acq";
  // Pro: entry plan
  return "pro_acq";
}

export function estimateAppointments(revenueGoal: number, avgJobValue: number, conversionRate: number): number {
  if (avgJobValue <= 0 || conversionRate <= 0) return 0;
  return Math.ceil(revenueGoal / (avgJobValue * conversionRate));
}

export function estimateBudget(plan: string, appointments: number): number {
  // Monthly subscription cost in dollars (matches plan_catalog refonte)
  const planCost: Record<string, number> = {
    pro_acq: 349,
    premium_acq: 599,
    elite_acq: 999,
    // legacy fallbacks
    recrue: 0, pro: 349, premium: 599, elite: 999, signature: 999,
  };
  const avgAppointmentCost = 85;
  return (planCost[plan] ?? 0) + appointments * avgAppointmentCost;
}
