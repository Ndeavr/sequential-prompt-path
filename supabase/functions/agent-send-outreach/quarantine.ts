// Incident circuit breaker, not a release flag. No UI, founder override,
// green operational score or message metadata can authorize this legacy queue.
// Remove only after an explicitly approved reconciliation and a tested atomic
// claim/recipient-window protocol for BOTH channels. Never drain or mutate it.
export const AGENT_QUEUE_QUARANTINE_REASON = "AGENT_QUEUE_RECONCILIATION_REQUIRED";

export function agentQueueEmissionStop(): Response {
  return new Response(JSON.stringify({
    ok: false, blocked: true, reason: AGENT_QUEUE_QUARANTINE_REASON,
    sent: 0, processed: 0, retryable: false,
    message: "File suspendue : réconciliation et validation requises avant tout envoi.",
  }), {
    status: 423,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Content-Type": "application/json",
    },
  });
}

export function assertAgentQueueEmissionStopped(): never {
  throw new Error(AGENT_QUEUE_QUARANTINE_REASON);
}