import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

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
