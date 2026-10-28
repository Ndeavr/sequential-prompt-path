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
