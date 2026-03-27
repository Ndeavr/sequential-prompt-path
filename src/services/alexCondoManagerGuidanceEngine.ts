/**
 * AlexCondoManagerGuidanceEngine — Guides condo managers through
 * building profiling, Loi 16 compliance, action planning, and maintenance scheduling.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export interface CondoProfile {
  id?: string;
  buildingName: string;
  address: string;
  city: string;
  postalCode?: string;
  unitCount: number;
  yearBuilt: number;
  buildingType?: string;
  reserveFundAmount?: number;
  recentMajorWorks?: string;
  syndicateName?: string;
  managerName?: string;
  managerEmail?: string;
  managerPhone?: string;
}

export type ComplianceStatus = "conforme" | "partiel" | "a_risque" | "unknown";

export interface Loi16Check {
  checkType: string;
  checkLabel: string;
  status: ComplianceStatus;
  isRequired: boolean;
  dueDate?: string;
  notes?: string;
}

export interface CondoActionItem {
  title: string;
  description?: string;
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  dueDate?: string;
}

export interface MaintenanceTask {
  taskTitle: string;
  taskDescription?: string;
  frequency: "monthly" | "quarterly" | "biannual" | "annual" | "5_years" | "10_years";
  category: string;
  priority: "high" | "medium" | "low";
  estimatedCost?: number;
  nextDueDate?: string;
}

// ─── Loi 16 compliance requirements ───

const LOI16_REQUIREMENTS: Loi16Check[] = [
  { checkType: "carnet_entretien", checkLabel: "Carnet d'entretien de l'immeuble", status: "unknown", isRequired: true },
  { checkType: "etude_fonds", checkLabel: "Étude du fonds de prévoyance", status: "unknown", isRequired: true },
  { checkType: "plan_travaux", checkLabel: "Plan de gestion de l'actif / travaux majeurs", status: "unknown", isRequired: true },
  { checkType: "inspection_batiment", checkLabel: "Inspection du bâtiment par un professionnel", status: "unknown", isRequired: true },
  { checkType: "registre_copropriete", checkLabel: "Registre de la copropriété à jour", status: "unknown", isRequired: true },
  { checkType: "assurance_batiment", checkLabel: "Police d'assurance du bâtiment", status: "unknown", isRequired: true },
  { checkType: "budget_previsionnel", checkLabel: "Budget prévisionnel annuel", status: "unknown", isRequired: true },
  { checkType: "pv_assemblees", checkLabel: "Procès-verbaux des assemblées", status: "unknown", isRequired: false },
  { checkType: "contrats_services", checkLabel: "Contrats de services (déneigement, entretien)", status: "unknown", isRequired: false },
];

// ─── Default maintenance templates ───

const DEFAULT_MAINTENANCE_TASKS: MaintenanceTask[] = [
  { taskTitle: "Inspection toiture", frequency: "annual", category: "structure", priority: "high", estimatedCost: 500 },
  { taskTitle: "Nettoyage gouttières", frequency: "biannual", category: "exterieur", priority: "medium", estimatedCost: 300 },
  { taskTitle: "Inspection plomberie commune", frequency: "annual", category: "plomberie", priority: "high", estimatedCost: 400 },
  { taskTitle: "Vérification système incendie", frequency: "annual", category: "securite", priority: "high", estimatedCost: 600 },
  { taskTitle: "Entretien ascenseur", frequency: "quarterly", category: "mecanique", priority: "high", estimatedCost: 800 },
  { taskTitle: "Inspection fondations", frequency: "5_years", category: "structure", priority: "high", estimatedCost: 2000 },
  { taskTitle: "Peinture parties communes", frequency: "5_years", category: "esthetique", priority: "low", estimatedCost: 5000 },
  { taskTitle: "Inspection électrique", frequency: "annual", category: "electricite", priority: "high", estimatedCost: 500 },
  { taskTitle: "Entretien paysager", frequency: "monthly", category: "exterieur", priority: "low", estimatedCost: 200 },
  { taskTitle: "Traitement contre parasites", frequency: "annual", category: "entretien", priority: "medium", estimatedCost: 350 },
];

// ─── Compliance evaluation ───

export function evaluateCompliance(checks: Loi16Check[]): { status: ComplianceStatus; score: number; requiredMissing: number } {
  const required = checks.filter(c => c.isRequired);
  const conformeCount = required.filter(c => c.status === "conforme").length;
  const score = Math.round((conformeCount / required.length) * 100);
  const requiredMissing = required.filter(c => c.status !== "conforme").length;

  let status: ComplianceStatus = "conforme";
  if (score < 50) status = "a_risque";
  else if (score < 100) status = "partiel";

  return { status, score, requiredMissing };
}

export function getLoi16Requirements(): Loi16Check[] {
  return [...LOI16_REQUIREMENTS];
}

// ─── Action plan generation ───

export function generateActionPlan(profile: CondoProfile, checks: Loi16Check[]): CondoActionItem[] {
  const actions: CondoActionItem[] = [];
  const age = new Date().getFullYear() - profile.yearBuilt;

  // From compliance gaps
  checks.filter(c => c.isRequired && c.status !== "conforme").forEach(check => {
    actions.push({
      title: `Compléter : ${check.checkLabel}`,
      description: `Document requis par la Loi 16. Statut actuel : ${check.status}`,
      priority: "high",
      category: "conformite",
    });
  });

  // Age-based
  if (age > 25) {
    actions.push({
      title: "Inspection structurale recommandée",
      description: `Bâtiment de ${age} ans — une inspection approfondie est conseillée.`,
      priority: "high",
      category: "structure",
      estimatedCostMin: 3000,
      estimatedCostMax: 8000,
    });
  }

  // Reserve fund
  const minReserve = profile.unitCount * 2000;
  if ((profile.reserveFundAmount || 0) < minReserve) {
    actions.push({
      title: "Renflouer le fonds de prévoyance",
      description: `Le fonds actuel semble insuffisant pour ${profile.unitCount} unités.`,
      priority: "critical",
      category: "finance",
    });
  }

  return actions.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));
}

function priorityWeight(p: string): number {
  const w: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return w[p] ?? 4;
}

// ─── Maintenance schedule ───

export function getDefaultMaintenanceTasks(profile: CondoProfile): MaintenanceTask[] {
  const tasks = [...DEFAULT_MAINTENANCE_TASKS];
  // Scale costs by unit count
  return tasks.map(t => ({
    ...t,
    estimatedCost: t.estimatedCost ? Math.round(t.estimatedCost * Math.max(1, profile.unitCount / 10)) : undefined,
  }));
}

// ─── Persistence ───

export async function saveCondoProfile(userId: string, profile: CondoProfile) {
  return supabase.from("condo_profiles").upsert({
    user_id: userId,
    building_name: profile.buildingName,
    address: profile.address,
    city: profile.city,
    postal_code: profile.postalCode,
    unit_count: profile.unitCount,
    year_built: profile.yearBuilt,
    building_type: profile.buildingType || "condo",
    reserve_fund_amount: profile.reserveFundAmount || 0,
    recent_major_works: profile.recentMajorWorks,
    syndicate_name: profile.syndicateName,
    manager_name: profile.managerName,
    manager_email: profile.managerEmail,
    manager_phone: profile.managerPhone,
  }, { onConflict: "user_id" }).select().single();
}

export async function initComplianceChecks(condoId: string) {
  const rows = LOI16_REQUIREMENTS.map(check => ({
    condo_id: condoId,
    check_type: check.checkType,
    check_label: check.checkLabel,
    status: "unknown",
    is_required: check.isRequired,
  }));
  return supabase.from("condo_compliance_checks").insert(rows);
}

export async function updateComplianceCheck(condoId: string, checkType: string, status: ComplianceStatus, notes?: string) {
  return supabase.from("condo_compliance_checks")
    .update({ status, notes, checked_at: new Date().toISOString() })
    .eq("condo_id", condoId)
    .eq("check_type", checkType);
}

export async function getComplianceChecks(condoId: string) {
  const { data } = await supabase.from("condo_compliance_checks")
    .select("*")
    .eq("condo_id", condoId);
  return data || [];
}

export async function saveActionPlan(condoId: string, actions: CondoActionItem[]) {
  const rows = actions.map(a => ({
    condo_id: condoId,
    title: a.title,
    description: a.description,
    priority: a.priority,
    category: a.category,
    estimated_cost_min: a.estimatedCostMin,
    estimated_cost_max: a.estimatedCostMax,
    due_date: a.dueDate,
    status: "planned",
  }));
  return supabase.from("condo_action_plans").insert(rows);
}

export async function saveMaintenanceTasks(condoId: string, tasks: MaintenanceTask[]) {
  const rows = tasks.map(t => ({
    condo_id: condoId,
    task_title: t.taskTitle,
    task_description: t.taskDescription,
    frequency: t.frequency,
    category: t.category,
    priority: t.priority,
    estimated_cost: t.estimatedCost,
    next_due_date: t.nextDueDate,
    status: "scheduled",
  }));
  return supabase.from("condo_maintenance_tasks").insert(rows);
}

export async function getCondoProfile(userId: string) {
  const { data } = await supabase.from("condo_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

export async function getActionPlan(condoId: string) {
  const { data } = await supabase.from("condo_action_plans")
    .select("*")
    .eq("condo_id", condoId)
    .order("priority");
  return data || [];
}

export async function getMaintenanceTasks(condoId: string) {
  const { data } = await supabase.from("condo_maintenance_tasks")
    .select("*")
    .eq("condo_id", condoId)
    .order("next_due_date");
  return data || [];
}

// ─── Role detection ───

export const CONDO_SIGNALS = [
  "copropriété",
  "syndicat",
  "gestion immeuble",
  "condo",
  "gestionnaire",
  "loi 16",
  "fonds de prévoyance",
  "carnet d'entretien",
  "assemblée",
  "unités",
  "multilogement",
];

export function detectCondoManagerIntent(message: string): boolean {
  const lower = message.toLowerCase();
  return CONDO_SIGNALS.some(s => lower.includes(s));
}

// ─── Document categories ───

export const DOCUMENT_CATEGORIES = [
  { key: "loi16", label: "Documents Loi 16" },
  { key: "assurance", label: "Assurances" },
  { key: "financier", label: "Documents financiers" },
  { key: "pv", label: "Procès-verbaux" },
  { key: "contrat", label: "Contrats" },
  { key: "inspection", label: "Rapports d'inspection" },
  { key: "travaux", label: "Devis et travaux" },
  { key: "general", label: "Général" },
];
