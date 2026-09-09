/**
 * UNPRO — Autonomy Operating Model (policy layer)
 *
 * Founder manual work is reduced to TWO classes:
 *   A) APPROVALS  — material changes proposed as approval cards
 *   B) HUMAN CALLS — prioritized phone conversations
 *
 * Everything else must run autonomously. This module is the single guardrail
 * that decides which side of the line an action falls on.
 *
 * It is ADDITIVE: it never loosens an existing compliance gate (kill switch,
 * CASL, suppression, dedupe, provider circuit). Those still run first.
 */
/** Minimal structural type so this module is importable from both Deno and the app test runner. */
// deno-lint-ignore no-explicit-any
type SupabaseClient = { from: (table: string) => any };

export type AutonomyDecision = "autonomous" | "requires_approval";

/** Routine operations that never need a founder click. */
export const AUTONOMOUS_ACTIONS = [
  "prospect_discovery",
  "prospect_enrichment",
  "eligibility_check",
  "compliance_check",
  "deduplication",
  "segmentation",
  "send_approved_template",
  "followup_approved_sequence",
  "funnel_stage_move",
  "onboarding_progress",
  "profile_enrichment_verified",
  "appointment_routing",
  "matching",
  "notification",
  "analytics_rollup",
  "content_maintenance",
  "seo_internal_linking",
  "anomaly_detection",
  "retry_transient",
  "queue_recovery",
  "reporting",
  "experiment_measurement",
  "threshold_tuning_within_guardrail",
  "call_list_generation",
] as const;

/** Material changes that must become an approval card instead of shipping. */
export const APPROVAL_ACTIONS = [
  "new_message_copy",
  "new_offer",
  "pricing_change",
  "funnel_behavior_change",
  "new_agent",
  "new_strategy",
  "guardrail_change",
  "compliance_policy_change",
] as const;

export type AutonomousAction = typeof AUTONOMOUS_ACTIONS[number];
export type ApprovalAction = typeof APPROVAL_ACTIONS[number];
export type AnyAction = AutonomousAction | ApprovalAction | string;

export type ApprovalKind =
  | "message" | "offer" | "funnel_behavior" | "pricing"
  | "new_agent" | "strategy" | "other";

const KIND_BY_ACTION: Record<string, ApprovalKind> = {
  new_message_copy: "message",
  new_offer: "offer",
  pricing_change: "pricing",
  funnel_behavior_change: "funnel_behavior",
  new_agent: "new_agent",
  new_strategy: "strategy",
  guardrail_change: "other",
  compliance_policy_change: "other",
};

/**
 * Classify an action. Unknown actions FAIL CLOSED to `requires_approval`
 * so a new capability can never silently ship a material change.
 */
export function classifyAction(action: AnyAction): AutonomyDecision {
  if ((AUTONOMOUS_ACTIONS as readonly string[]).includes(action)) return "autonomous";
  return "requires_approval";
}

export function approvalKindFor(action: AnyAction): ApprovalKind {
  return KIND_BY_ACTION[action] ?? "other";
}

export interface ApprovalProposal {
  action: AnyAction;
  title: string;
  proposed_change: Record<string, unknown>;
  reason: string;
  /** Real production evidence only. Never fabricated. */
  evidence: Record<string, unknown>;
  expected_impact: string;
  risk_level?: "low" | "medium" | "high";
  rollback_plan: string;
  proposed_by_agent: string;
  /** Stable key of the thing being changed (template key, agent_key, plan code…). */
  target_key?: string | null;
}

/**
 * Create (or reuse) a pending approval card. Idempotent per
 * agent + action + target_key while a card is still pending.
 */
export async function proposeApproval(
  sb: SupabaseClient,
  p: ApprovalProposal,
): Promise<{ created: boolean; id: string | null }> {
  const kind = approvalKindFor(p.action);

  const { data: existing } = await sb
    .from("founder_approvals")
    .select("id")
    .eq("status", "pending")
    .eq("kind", kind)
    .eq("proposed_by_agent", p.proposed_by_agent)
    .eq("target_key", p.target_key ?? p.title)
    .maybeSingle();

  if (existing?.id) return { created: false, id: existing.id as string };

  const { data, error } = await sb
    .from("founder_approvals")
    .insert({
      kind,
      title: p.title,
      proposed_change: p.proposed_change,
      reason: p.reason,
      evidence: p.evidence,
      expected_impact: p.expected_impact,
      risk_level: p.risk_level ?? "medium",
      rollback_plan: p.rollback_plan,
      proposed_by_agent: p.proposed_by_agent,
      target_key: p.target_key ?? p.title,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error) return { created: false, id: null };
  return { created: true, id: (data?.id as string) ?? null };
}

/**
 * Gate helper for agents: run `execute` only when the action is autonomous.
 * Otherwise a proposal card is created and nothing ships.
 */
export async function runOrPropose<T>(
  sb: SupabaseClient,
  action: AnyAction,
  proposal: () => ApprovalProposal,
  execute: () => Promise<T>,
): Promise<{ decision: AutonomyDecision; result?: T; approval_id?: string | null }> {
  if (classifyAction(action) === "autonomous") {
    return { decision: "autonomous", result: await execute() };
  }
  const { id } = await proposeApproval(sb, proposal());
  return { decision: "requires_approval", approval_id: id };
}
