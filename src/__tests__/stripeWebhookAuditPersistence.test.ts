import { describe, expect, it } from "vitest";
import { assertWebhookAuditFinalized, classifyWebhookAuditInsert } from "../../supabase/functions/_shared/webhookAuditPersistence";

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

  describe("terminal receipt: never ACK a missing or foreign event", () => {
    const eventId = "evt_signed_entry350_001";
    const failure = "webhook_audit_finalization_failed";

    it("accepts a successful persisted terminal receipt for the exact event", () => {
      expect(() => assertWebhookAuditFinalized({
        data: { stripe_event_id: eventId },
        error: null,
      }, eventId)).not.toThrow();
    });

    it("rejects a database error even when a matching row is returned", () => {
      expect(() => assertWebhookAuditFinalized({
        data: { stripe_event_id: eventId },
        error: { code: "08006" },
      }, eventId)).toThrow(failure);
    });

    it("rejects an empty update result instead of acknowledging Stripe", () => {
      expect(() => assertWebhookAuditFinalized({ data: null, error: null }, eventId)).toThrow(failure);
    });

    it("rejects a different Stripe event receipt even when the update reports success", () => {
      expect(() => assertWebhookAuditFinalized({
        data: { stripe_event_id: "evt_foreign" },
        error: null,
      }, eventId)).toThrow(failure);
    });
  });
});
