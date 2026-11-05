import { describe, it, expect } from "vitest";
import { testPaymentProofOk } from "../../supabase/functions/acq-e2e-real/assertions";

const RUN = "1291f5b1-5d18-48e5-8b96-fe1127f378e4";
const SID = "cs_test_abc123";
const expected = { run_group: RUN, session_id: SID };

const paidSession = {
  id: SID,
  payment_status: "paid",
  status: "complete",
  livemode: false,
  amount_total: 100,
  currency: "cad",
  metadata: { run_group: RUN, e2e: "true" },
};
const webhookRow = { session_id: SID, event_type: "checkout.session.completed", livemode: false };

describe("acq-e2e-real TEST payment proof", () => {
  it("passes only with paid TEST session + signature-verified webhook row for the same run", () => {
    expect(testPaymentProofOk(paidSession, webhookRow, expected)).toBe(true);
  });
  it("rejects connectivity alone: no webhook row", () => {
    expect(testPaymentProofOk(paidSession, null, expected)).toBe(false);
  });
  it("rejects unpaid / expired session", () => {
    expect(testPaymentProofOk({ ...paidSession, payment_status: "unpaid", status: "expired" }, webhookRow, expected)).toBe(false);
  });
  it("rejects livemode=true even if paid", () => {
    expect(testPaymentProofOk({ ...paidSession, livemode: true }, webhookRow, expected)).toBe(false);
    expect(testPaymentProofOk(paidSession, { ...webhookRow, livemode: true }, expected)).toBe(false);
  });
  it("rejects amount/currency mismatch (never a real 350 $ activation)", () => {
    expect(testPaymentProofOk({ ...paidSession, amount_total: 35000 }, webhookRow, expected)).toBe(false);
    expect(testPaymentProofOk({ ...paidSession, currency: "usd" }, webhookRow, expected)).toBe(false);
  });
  it("rejects run_group or session mismatch (no cross-run replay)", () => {
    expect(testPaymentProofOk({ ...paidSession, metadata: { run_group: "other", e2e: "true" } }, webhookRow, expected)).toBe(false);
    expect(testPaymentProofOk(paidSession, { ...webhookRow, session_id: "cs_test_other" }, expected)).toBe(false);
    expect(testPaymentProofOk({ ...paidSession, id: "cs_test_other" }, webhookRow, expected)).toBe(false);
  });
  it("rejects non-completed webhook event types", () => {
    expect(testPaymentProofOk(paidSession, { ...webhookRow, event_type: "checkout.session.expired" }, expected)).toBe(false);
  });
});
