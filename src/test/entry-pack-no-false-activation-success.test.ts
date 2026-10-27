import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { entryPackReplayReceiptMatches } from "../../supabase/functions/_shared/checkoutGuards";

const source = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");

describe("P0: a paid entry pack is not a verified contractor activation", () => {
  it("requires a contractor and a durable receipt before any success audit or funnel event", () => {
    const start = source.indexOf('const activationToken = session.metadata?.activation_token');
    const end = source.indexOf("// ACQUISITION PIPELINE flow:");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const handler = source.slice(start, end);
    const receiptGuard = handler.indexOf("(!activatedContractorId || entryPackFatal)");
    const successAudit = handler.indexOf('from("unpro_payment_activation_audit").insert');
    const paidFunnel = handler.indexOf('_event_type: "paid"');
    const completedFunnel = handler.indexOf('_event_type: "payment_completed"');
    expect(receiptGuard).toBeGreaterThan(0);
    expect(successAudit).toBeGreaterThan(receiptGuard);
    expect(paidFunnel).toBeGreaterThan(receiptGuard);
    expect(completedFunnel).toBeGreaterThan(receiptGuard);
    expect(handler).toContain("throw entryPackFatal;");
    expect(handler).toContain("if (entryPackFatal) throw entryPackFatal;");
  });
});

describe("P0: repeated LIVE entry-pack receipt must belong to the same business", () => {
  const expected = { contractorId: "contractor-1", paymentIntentId: "pi_live_1" };
  const original = {
    contractor_id: "contractor-1",
    source: "stripe_webhook",
    metadata: { stripe_session_id: "cs_live_1", stripe_payment_intent: "pi_live_1", livemode: true, offer: "entry_pack_350" },
  };

  it("permits a verified replay for the same contractor and payment intent", () => {
    expect(entryPackReplayReceiptMatches(original, expected)).toBe(true);
  });

  it("rejects a receipt for another business or payment intent", () => {
    expect(entryPackReplayReceiptMatches({ ...original, contractor_id: "contractor-2" }, expected)).toBe(false);
    expect(entryPackReplayReceiptMatches({ ...original, metadata: { ...original.metadata, stripe_payment_intent: "pi_live_2" } }, expected)).toBe(false);
    expect(entryPackReplayReceiptMatches(original, { ...expected, paymentIntentId: null })).toBe(false);
    expect(entryPackReplayReceiptMatches(null, expected)).toBe(false);
  });

  it("rejects a TEST, wrong-offer, or non-webhook ledger entry", () => {
    expect(entryPackReplayReceiptMatches({ ...original, source: "admin_manual" }, expected)).toBe(false);
    expect(entryPackReplayReceiptMatches({ ...original, metadata: { ...original.metadata, livemode: false } }, expected)).toBe(false);
    expect(entryPackReplayReceiptMatches({ ...original, metadata: { ...original.metadata, offer: "activation_7d" } }, expected)).toBe(false);
  });

  it("requires the 23505 named-session constraint and receipt lookup before success telemetry", () => {
    const check = source.indexOf('const sameSessionConflict = ledErr.code === "23505"');
    const match = source.indexOf("entryPackReplayReceiptMatches(", check);
    const success = source.indexOf('from("unpro_payment_activation_audit").insert', match);
    expect(check).toBeGreaterThan(0);
    expect(source.slice(check, match)).toContain('entry350LedgerConflict(ledErr.message) === "same_session"');
    expect(match).toBeGreaterThan(check);
    expect(success).toBeGreaterThan(match);
  });
});
