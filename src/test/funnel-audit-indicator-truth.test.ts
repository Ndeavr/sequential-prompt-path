import { describe, expect, it } from "vitest";
import { classifyTrackingLinks, unverifiedPayments } from "../../supabase/functions/funnel-audit-report/indicatorTruth";

const prospect = { id: "real-prospect", business_name: "Entreprise authentique", source: "official_website" };
const link = (campaign: string, click_count: number, extra = {}) => ({ campaign, click_count, prospect_id: prospect.id, ...extra });

describe("Funnel audit — commercial click truth", () => {
  it("preserves 29 raw clicks but excludes the 17 QA clicks: 12 clicks on 4 of 8 commercial links", () => {
    const commercial = [3, 3, 3, 3, 0, 0, 0, 0].map(n => link("outreach_messages", n));
    const internal = [link("__e2e_real", 5), link("e2e_selftest", 4), link("admin_test", 4), link("smoke", 2), link("__repair_messaging", 2)];
    const rows = [...commercial, ...internal, ...Array.from({ length: 38 }, () => link("admin_test", 0))];
    expect(classifyTrackingLinks(rows, [prospect], [])).toMatchObject({ raw_links: 51, raw_clicks: 29, commercial_links: 8, commercial_attributed_clicks: 12, commercial_clicked_links: 4, excluded_clicks: 17, human_verification: "not_verified" });
  });
  it.each(["__e2e_real", "e2e_selftest", "admin_test", "smoke", "__repair_messaging", "fixture", "simulation"])("excludes %s even with real attribution", campaign => {
    expect(classifyTrackingLinks([link(campaign, 1)], [prospect], []).commercial_attributed_clicks).toBe(0);
  });
  it("never infers a prospect from an unlinked or dangling link", () => {
    const rows = [link("outreach_messages", 2, { prospect_id: null }), link("outreach_messages", 3, { prospect_id: "missing" })];
    expect(classifyTrackingLinks(rows, [prospect], []).commercial_attributed_clicks).toBe(0);
  });
  it("excludes QA entities, bots and incomplete conflicting attribution", () => {
    const rows = [link("outreach_messages", 1, { metadata: { is_bot: true } }), link("outreach_messages", 1, { prospect_id: "qa" }), link("outreach_messages", 1, { contractor_id: "missing" })];
    expect(classifyTrackingLinks(rows, [prospect, { id: "qa", source_name: "__e2e_real" }], []).commercial_attributed_clicks).toBe(0);
  });
  it("accepts only an existing non-QA contractor link without inventing a prospect", () => {
    expect(classifyTrackingLinks([link("outreach_messages", 1, { prospect_id: null, contractor_id: "contractor" })], [], [{ id: "contractor", business_name: "Entreprise" }]).commercial_clicked_links).toBe(1);
  });
});

describe("Funnel audit — no uncorroborated LIVE sale", () => {
  it.each([
    { checkout_status: "complete", payment_status: "unpaid" },
    { payment_status: "paid" },
    { payment_status: "paid", stripe_checkout_session_id: "cs_test_fixture", livemode: false },
    { payment_status: "paid", mode: "subscription", amount_total: 35000, currency: "cad" },
    { payment_status: "paid", refunded: true, amount_total: 40241, currency: "cad" },
    { payment_status: "paid", amount_total: 115, currency: "cad" },
    { payment_status: "paid", amount_total: 35000, currency: "usd" },
    { payment_status: "paid", amount_total: 40241, currency: "cad", livemode: true },
    { ui_success: true },
    { checkout_status: "expired" },
  ])("returns zero/not_verified without signed LIVE payment, contract, activation and refund evidence: %j", row => {
    expect(unverifiedPayments([row])).toMatchObject({ count: 0, verification_status: "not_verified" });
  });
  it("keeps old status candidates separate, without mutating history", () => {
    const rows = Object.freeze([Object.freeze({ checkout_status: "complete" }), Object.freeze({ payment_status: "paid" })]);
    expect(unverifiedPayments([...rows])).toMatchObject({ count: 0, raw_status_candidates: 2 });
    expect(rows[0].checkout_status).toBe("complete");
  });
});