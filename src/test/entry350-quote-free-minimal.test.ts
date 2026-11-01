// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createQa, OWNER } from "./support/entry350Qa";

let qa: Awaited<ReturnType<typeof createQa>>;
beforeAll(async () => { qa = await createQa(); }, 15000);
afterAll(async () => { await qa.close(); });
describe("Canonical entry350 without a quote — provider-free", () => {
  it("refuses missing authentication before Stripe", async () => {
    expect((await qa.checkout("personal", { entryActivation: true, declaredCompanyName: "Atelier QA" })).status).toBe(401);
    expect(qa.sessions).toHaveLength(0);
  });
  it("requires a declared name before creating the company", async () => {
    const result = await qa.checkout("personal", { entryActivation: true }, qa.ownerToken);
    expect(result.body.code).toBe("business_name_required");
    expect(qa.sessions).toHaveLength(0);
  });
  it("keeps personalized purchases without a quote refused", async () => {
    const result = await qa.checkout("personal", { planId: "pro" }, qa.ownerToken);
    expect(result.status).toBe(409);
    expect(result.body.code).toBe("personalized_quote_required");
    expect(qa.sessions).toHaveLength(0);
  });
  it("creates only one unpaid 350 CAD plus TPS/TVQ session, linked to its owner, on retry", async () => {
    const body = { entryActivation: true, declaredCompanyName: "Atelier QA" };
    const first = await qa.checkout("personal", body, qa.ownerToken);
    const retry = await qa.checkout("personal", body, qa.ownerToken);
    expect(first.status).toBe(200);
    expect(retry.body.sessionId).toBe(first.body.sessionId);
    expect(qa.sessions).toHaveLength(1);
    expect(qa.sessions[0]).toMatchObject({ mode: "payment", currency: "cad", amount_subtotal: 35000, amount_total: 40241, payment_status: "unpaid", metadata: { user_id: OWNER, offer: "entry_activation_350", presence_ia_months: "12", guaranteed_appointments: "0" } });
    expect(qa.configs[0].subscription_data).toBeUndefined();
    expect(qa.configs[0].discounts).toBeUndefined();
    const company = (await qa.db.query("select user_id,business_name from contractors")).rows;
    expect(company).toEqual([{ user_id: OWNER, business_name: "Atelier QA" }]);
    expect((await qa.db.query("select * from contractor_activation_ledger")).rows).toHaveLength(0);
    expect(qa.peripheral.get("contractor_funnel_events")).toEqual(expect.arrayContaining([expect.objectContaining({ user_id: OWNER, email: "owner-one@qa.invalid", event_type: "entry_350_checkout_attempted" })]));
  });
});