/**
 * UNPRO — Reliability: reportOutcome (Rule 10)
 * Every agent/operation MUST call this on every terminal state.
 * Writes to public.platform_operation_outcomes.
 */
import { supabase } from "@/integrations/supabase/client";
import type { OperationReport } from "./types";

export async function reportOutcome(r: OperationReport): Promise<void> {
  try {
    await supabase.from("platform_operation_outcomes" as any).insert({
      operation: r.operation,
      intent: r.intent ?? null,
      business_outcome: r.outcome,
      failure_code: r.failure_code ?? null,
      block_reason: r.block_reason ?? null,
      affected_record: r.affected_record ?? null,
      service: r.service ?? null,
      attempt: r.attempt ?? 1,
      next_retry_at: r.next_retry_at ?? null,
      revenue_impact_cents: r.revenue_impact_cents ?? null,
      next_action: r.next_action ?? null,
      payload: r.payload ?? null,
    });
  } catch (e) {
    // Diagnostics must never throw — log to console only.
    // eslint-disable-next-line no-console
    console.error("[reliability] reportOutcome failed", e, r);
  }
}

export { FailureCode, BlockReason, RETRY_BACKOFF_MIN } from "./types";
export type { BusinessOutcome, OperationReport } from "./types";
export { withRetry, nextRetryAt } from "./withRetry";
export { createStateMachine, LeadPipelineStates } from "./stateMachine";
export type { LeadPipelineState } from "./stateMachine";
