/**
 * AlexPlanTruthEngine — Client-side validation + plan data service
 * Enforces truth rules for contractor plan discussions.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PlanDefinition {
  id: string;
  name: string;
  code: string;
  priceMonthly: number;
  appointmentsIncluded: number;
  appointmentType: string;
  features: string[];
  priorityLevel: number;
  territoryAccess: string;
  optimizationLevel: string;
  differentiator: string;
  positionRank: number;
}

export interface KnowledgeBase {
  allowedTopics: string[];
  forbiddenTopics: string[];
  corePositioning: string;
  responseTemplate: string;
}

export interface TruthValidation {
  validated: boolean;
  hallucinationDetected: boolean;
  detectedTerms: string[];
  severity: "none" | "low" | "medium" | "high" | "critical";
  correctedResponse: string | null;
}

// ─── FORBIDDEN TERMS (client-side fast check) ───
const FORBIDDEN_TERMS = [
  "gestion de projet", "facturation", "crm", "suivi de chantier",
  "comptabilité", "gestion des employés", "paie", "inventaire",
  "devis automatisé", "contrats juridiques", "assurances",
  "gestion documentaire", "erp", "planification de chantier",
  "bon de commande", "feuille de temps", "gestion des factures",
  "logiciel de gestion", "outil administratif",
];

/** Fast client-side hallucination check */
export function quickValidate(responseText: string): TruthValidation {
  const lower = responseText.toLowerCase();
  const detected = FORBIDDEN_TERMS.filter(t => lower.includes(t));

  return {
    validated: detected.length === 0,
    hallucinationDetected: detected.length > 0,
    detectedTerms: detected,
    severity: detected.length === 0 ? "none" : detected.length <= 2 ? "medium" : "high",
    correctedResponse: null,
  };
}

/** Fetch plan definitions from DB */
export async function fetchPlanDefinitions(): Promise<PlanDefinition[]> {
  const { data, error } = await supabase
    .from("contractor_plan_definitions")
    .select("*")
    .eq("is_active", true)
    .order("position_rank");

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    priceMonthly: row.price_monthly,
    appointmentsIncluded: row.appointments_included,
    appointmentType: row.appointment_type,
    features: Array.isArray(row.features) ? row.features : [],
    priorityLevel: row.priority_level,
    territoryAccess: row.territory_access,
    optimizationLevel: row.optimization_level,
    differentiator: row.differentiator ?? "",
    positionRank: row.position_rank,
  }));
}

/** Fetch knowledge base */
export async function fetchKnowledgeBase(): Promise<KnowledgeBase | null> {
  const { data } = await supabase
    .from("alex_knowledge_plans")
    .select("*")
    .eq("is_active", true)
    .eq("language", "fr")
    .limit(1)
    .single();

  if (!data) return null;

  return {
    allowedTopics: data.allowed_topics ?? [],
    forbiddenTopics: data.forbidden_topics ?? [],
    corePositioning: data.core_positioning ?? "",
    responseTemplate: data.response_template ?? "",
  };
}

/** Full server-side validation via edge function */
export async function validateResponse(
  responseText: string,
  userMessage: string,
  sessionId?: string,
  userId?: string,
): Promise<TruthValidation & { planData?: PlanDefinition[] }> {
  const { data, error } = await supabase.functions.invoke("validate-alex-response", {
    body: { response_text: responseText, user_message: userMessage, session_id: sessionId, user_id: userId },
  });

  if (error) {
    // Fallback to client-side
    return quickValidate(responseText);
  }

  return {
    validated: data.validated,
    hallucinationDetected: data.hallucination_detected,
    detectedTerms: data.detected_terms ?? [],
    severity: data.severity ?? "none",
    correctedResponse: data.corrected_response,
    planData: data.plan_data?.map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      priceMonthly: row.price_monthly,
      appointmentsIncluded: row.appointments_included,
      appointmentType: row.appointment_type,
      features: Array.isArray(row.features) ? row.features : [],
      priorityLevel: row.priority_level,
      territoryAccess: row.territory_access,
      optimizationLevel: row.optimization_level,
      differentiator: row.differentiator ?? "",
      positionRank: row.position_rank,
    })),
  };
}

/** Build safe plan comparison response */
export function buildPlanComparisonResponse(plans: PlanDefinition[]): string {
  const lines = plans.map(p =>
    `**${p.name}** — ${(p.priceMonthly / 100).toFixed(0)} $/mois\n` +
    `${p.appointmentsIncluded} rendez-vous exclusifs · ${p.differentiator}`
  );
  return `Voici les plans UNPRO disponibles :\n\n${lines.join("\n\n")}\n\nChaque rendez-vous est exclusif — vous êtes le seul professionnel recommandé. Quel plan correspond le mieux à votre capacité mensuelle ?`;
}

/** Revenue projection based on plan + capacity */
export function projectRevenue(
  plan: PlanDefinition,
  avgContractValue: number = 5000,
  closeRate: number = 0.35,
): { monthlyRevenue: number; yearlyRevenue: number; roi: number } {
  const conversions = Math.round(plan.appointmentsIncluded * closeRate);
  const monthlyRevenue = conversions * avgContractValue;
  const yearlyRevenue = monthlyRevenue * 12;
  const roi = plan.priceMonthly > 0 ? Math.round(((monthlyRevenue - plan.priceMonthly / 100) / (plan.priceMonthly / 100)) * 100) : 0;
  return { monthlyRevenue, yearlyRevenue, roi };
}
