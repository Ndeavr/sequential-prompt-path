/**
 * AlexAgentTriggerEngine — Triggers background agents from Alex decisions.
 * Each agent is mapped to an edge function or internal service.
 */

import { supabase } from "@/integrations/supabase/client";

export type AgentKey =
  | "growth_agent"
  | "booking_agent"
  | "trust_agent"
  | "document_agent"
  | "property_agent"
  | "partner_agent"
  | "admin_ops_agent"
  | "finance_agent"
  | "seo_agent";

interface AgentTriggerInput {
  agentKey: AgentKey;
  context: Record<string, unknown>;
  triggeredBy: string; // userId or "system"
  reason: string;
}

const AGENT_EDGE_MAP: Record<AgentKey, string | null> = {
  growth_agent: "autonomous-growth-engine",
  booking_agent: "create-appointment-from-match",
  trust_agent: "verify-contractor",
  document_agent: "extract-document-entities",
  property_agent: "property-autopilot",
  partner_agent: null, // future
  admin_ops_agent: null, // internal only
  finance_agent: null, // future
  seo_agent: "seo-generator",
};

/**
 * Trigger an agent, logging the action and optionally invoking the edge function.
 */
export async function triggerAgent(input: AgentTriggerInput): Promise<{ success: boolean; error?: string }> {
  // Log to agent_logs
  await supabase.from("agent_logs").insert({
    agent_name: input.agentKey,
    log_type: "trigger",
    message: `Alex triggered ${input.agentKey}: ${input.reason}`,
    metadata: {
      triggered_by: input.triggeredBy,
      context_keys: Object.keys(input.context),
    } as any,
  });

  // Invoke edge function if mapped
  const edgeFn = AGENT_EDGE_MAP[input.agentKey];
  if (edgeFn) {
    try {
      const { error } = await supabase.functions.invoke(edgeFn, {
        body: { ...input.context, _trigger: "alex_god_mode" },
      });
      if (error) {
        console.error(`[AgentTrigger] ${edgeFn} error:`, error);
        return { success: false, error: error.message };
      }
    } catch (e: any) {
      console.error(`[AgentTrigger] ${edgeFn} exception:`, e);
      return { success: false, error: e.message };
    }
  }

  return { success: true };
}

/**
 * List available agents with their status.
 */
export function listAgents(): Array<{ key: AgentKey; hasEdgeFunction: boolean }> {
  return (Object.entries(AGENT_EDGE_MAP) as [AgentKey, string | null][]).map(([key, fn]) => ({
    key,
    hasEdgeFunction: fn !== null,
  }));
}
