/**
 * Canonical Stripe webhook audit must be durable before fulfillment starts.
 * Only the verified event-id UNIQUE constraint denotes safe redelivery.
 * Any other PostgREST failure must request a Stripe retry (HTTP 5xx).
 */
export type WebhookAuditInsertError = {
  code?: string | null;
  message?: string | null;
} | null | undefined;

export function classifyWebhookAuditInsert(
  error: WebhookAuditInsertError,
): "inserted" | "redelivery" | "unavailable" {
  if (!error) return "inserted";
  if (
    error.code === "23505" &&
    (error.message ?? "").includes("stripe_webhook_events_stripe_event_id_key")
  ) return "redelivery";
  return "unavailable";
}

/**
 * Stripe must retry if the terminal webhook audit state was not durably stored.
 * A 2xx response without this row would strand a paid entry350 entitlement
 * behind the processed+success gate (or mask a missing audit receipt).
 */
export function assertWebhookAuditFinalized(
  result: {
    data?: { stripe_event_id: string } | null;
    error?: { code?: string | null } | null;
  },
  expectedEventId: string,
): void {
  if (result.error || result.data?.stripe_event_id !== expectedEventId) {
    throw new Error("webhook_audit_finalization_failed");
  }
}
