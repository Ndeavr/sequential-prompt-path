import { describe, expect, it } from "vitest";
import { classifyWebhookAuditInsert } from "../../supabase/functions/_shared/webhookAuditPersistence";

describe("signed Stripe webhook durable event audit gate", () => {
  it("allows fulfillment path only after successful event receipt insertion", () => {
    expect(classifyWebhookAuditInsert(null)).toBe("inserted");
  });

  it("recognizes only the known Stripe event-id unique constraint as a redelivery", () => {
    expect(classifyWebhookAuditInsert({
      code: "23505",
      message: 'duplicate key value violates unique constraint "stripe_webhook_events_stripe_event_id_key"',
    })).toBe("redelivery");
  });

  it.each([
    { code: "08006", message: "database unavailable" },
    { code: "42501", message: "permission denied" },
    { code: "23505", message: 'duplicate key value violates unique constraint "stripe_webhook_events_pkey"' },
    { code: "", message: "duplicate key value violates unique constraint" },
    { code: "23503", message: "foreign key violation" },
  ])("requests Stripe retry on unverified or failed persistence: $code", (error) => {
    expect(classifyWebhookAuditInsert(error)).toBe("unavailable");
  });
});
