// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const report = readFileSync("supabase/functions/funnel-audit-report/index.ts", "utf8");

describe("legacy funnel report never certifies $350 revenue or Clara eligibility", () => {
  it("calls CRM/event payment signals unverified rather than successful Stripe sales", () => {
    expect(report).toContain("const paidSignalsUnverified = Math.max(evPaid.length, paidLeads.length)");
    expect(report).toContain('key: "payment_success", label: "Signaux paiement — NON vérifiés Stripe"');
    expect(report).not.toContain('key: "payment_success", label: "Paiement réussi"');
  });

  it("does not present a CRM activation as a 12-month entitlement or licensed match", () => {
    expect(report).toContain('key: "activated", label: "Activation CRM — droits NON vérifiés"');
    expect(report).toContain('key: "recommendable", label: "Activation déclarée — licence NON vérifiée"');
    expect(report).not.toContain('label: "Recommandable par Clara"');
  });

  it("identifies unverified legacy stage keys without changing their compatibility keys", () => {
    expect(report).toContain('unverified_legacy_indicators: ["payment_success", "activated", "recommendable"]');
    expect(report).toContain("real_pipeline: realPipeline");
  });
});
