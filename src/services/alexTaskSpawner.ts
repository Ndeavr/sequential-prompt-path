/**
 * AlexTaskSpawner — Creates follow-up tasks from Alex decisions.
 * Tasks are stored in agent_tasks table for orchestration.
 */

import { supabase } from "@/integrations/supabase/client";

export type AlexTaskType =
  | "follow_up_booking"
  | "request_missing_document"
  | "remind_score_review"
  | "reopen_incomplete_flow"
  | "suggest_plan_upgrade"
  | "verify_contractor_doc"
  | "generate_property_prediction"
  | "escalate_admin_issue"
  | "partner_followup"
  | "payment_followup";

export interface SpawnTaskInput {
  taskType: AlexTaskType;
  userId: string;
  description: string;
  urgency?: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
}

const TASK_CONFIGS: Record<AlexTaskType, { title: string; domain: string; autoExecutable: boolean }> = {
  follow_up_booking: { title: "Relancer rendez-vous incomplet", domain: "booking", autoExecutable: true },
  request_missing_document: { title: "Demander document manquant", domain: "documents", autoExecutable: false },
  remind_score_review: { title: "Rappel de revue du score", domain: "scoring", autoExecutable: true },
  reopen_incomplete_flow: { title: "Rouvrir flow incomplet", domain: "conversion", autoExecutable: true },
  suggest_plan_upgrade: { title: "Suggérer mise à niveau de plan", domain: "growth", autoExecutable: false },
  verify_contractor_doc: { title: "Vérifier document entrepreneur", domain: "trust", autoExecutable: false },
  generate_property_prediction: { title: "Générer prédiction propriété", domain: "property", autoExecutable: true },
  escalate_admin_issue: { title: "Escalader un problème", domain: "admin", autoExecutable: false },
  partner_followup: { title: "Suivi partenaire", domain: "partners", autoExecutable: false },
  payment_followup: { title: "Suivi paiement", domain: "billing", autoExecutable: false },
};

/**
 * Spawn a task into the agent_tasks table.
 */
export async function spawnAlexTask(input: SpawnTaskInput): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const config = TASK_CONFIGS[input.taskType];
  if (!config) return { success: false, error: `Unknown task type: ${input.taskType}` };

  const { data, error } = await supabase
    .from("agent_tasks")
    .insert({
      agent_name: "alex-os",
      agent_domain: config.domain,
      task_title: config.title,
      task_description: input.description,
      urgency: input.urgency || "medium",
      impact_score: input.urgency === "critical" ? 90 : input.urgency === "high" ? 70 : 50,
      auto_executable: config.autoExecutable,
      status: "proposed",
      action_plan: input.metadata ? input.metadata as any : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[AlexTaskSpawner] Insert failed:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, taskId: data.id };
}

/**
 * List pending Alex tasks for a domain.
 */
export async function listAlexTasks(domain?: string) {
  let query = supabase
    .from("agent_tasks")
    .select("*")
    .eq("agent_name", "alex-os")
    .in("status", ["proposed", "approved"])
    .order("proposed_at", { ascending: false })
    .limit(20);

  if (domain) query = query.eq("agent_domain", domain);

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}
