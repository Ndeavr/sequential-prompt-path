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
 * Plan recommendation engine based on calculator inputs
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

  // Signature: extreme goals or XXL + high capacity
  if (revenueGoal >= 40000 || (hasXXL && monthlyCapacity >= 20)) return "signature";
  // Elite: XXL access or high revenue
  if (hasXXL || revenueGoal >= 25000) return "elite";
  // Premium: XL access or ambitious goals
  if (hasXL || revenueGoal >= 15000) return "premium";
  // Pro: moderate goals, L projects
  if (projectTypes.includes("L") || revenueGoal >= 6000) return "pro";
  // Recrue: discovery
  return "recrue";
}

export function estimateAppointments(revenueGoal: number, avgJobValue: number, conversionRate: number): number {
  if (avgJobValue <= 0 || conversionRate <= 0) return 0;
  return Math.ceil(revenueGoal / (avgJobValue * conversionRate));
}

export function estimateBudget(plan: string, appointments: number): number {
  const planCost: Record<string, number> = { recrue: 0, pro: 49, premium: 99, elite: 199, signature: 399 };
  const avgAppointmentCost = 85;
  return (planCost[plan] ?? 0) + appointments * avgAppointmentCost;
}
