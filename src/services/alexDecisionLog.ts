/**
 * AlexDecisionLog — Records every God Mode decision for audit and learning.
 */

import { supabase } from "@/integrations/supabase/client";
import type { GodDecision } from "./alexGodModeEngine";

export async function logGodDecision(
  userId: string,
  decision: GodDecision,
  sessionId?: string
): Promise<void> {
  await supabase.from("agent_logs").insert({
    agent_name: "alex-god-mode",
    log_type: "decision",
    message: `[${decision.type}] ${decision.target} — ${decision.reason}`,
    metadata: {
      user_id: userId,
      session_id: sessionId,
      decision_type: decision.type,
      target: decision.target,
      confidence: decision.confidence,
      priority: decision.priority,
      alex_text: decision.alexText,
      ui_actions: decision.uiActions,
    } as any,
  });
}
