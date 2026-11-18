// @vitest-environment node
// Isolated: in-memory database + local Stripe fixture only. No real key, session, charge or message.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createQa } from "./support/entry350Qa";

let qa: Awaited<ReturnType<typeof createQa>>;
beforeEach(async () => { qa = await createQa(); }, 15000);
afterEach(async () => { await qa.close(); });

const founderBody = { entryActivation: true, declaredCompanyName: "Atelier synthétique", presenceOffer: "founder_120m" };
const ledger = async () => (await qa.db.query("select metadata, after_state from contractor_activation_ledger where action='entry_activation_350_paid'")).rows as any[];

describe("Présence IA — Fondateur 1 995 $ (QA isolée)", () => {
  it("LIVE fermé par défaut : refus avant toute session Stripe", async () => {
    const r = await qa.checkout("personal", founderBody, qa.ownerToken);
    expect(r.status).toBe(503);
    expect(r.body.code).toBe("founder_live_not_released");
    expect(qa.sessions).toHaveLength(0);
  });
  it("jamais combiné à un code promo : refus, rien créé", async () => {
    qa.env.PRESENCE_FOUNDER_LIVE_RELEASED = "true";
    const r = await qa.checkout("personal", { ...founderBody, entryPromoCode: "PROMO" }, qa.ownerToken);
    expect(r.status).toBe(409);
    expect(r.body.code).toBe("founder_offer_incompatible");
    expect(qa.sessions).toHaveLength(0);
  });
  it("identifiant d'offre inconnu : refus", async () => {
    const r = await qa.checkout("personal", { ...founderBody, presenceOffer: "founder_free" }, qa.ownerToken);
    expect(r.status).toBe(400);
    expect(qa.sessions).toHaveLength(0);
  });
  it("session : 1 995 $ + TPS/TVQ = 2 293,75 $, paiement unique; webhook = 120 mois, idempotent", async () => {
    qa.env.PRESENCE_FOUNDER_LIVE_RELEASED = "true"; // ouverture simulée, fixture locale seulement
    const r = await qa.checkout("personal", founderBody, qa.ownerToken);
    expect(r.status).toBe(200);
    const cfg = qa.configs[0] as any;
    expect(cfg.mode).toBe("payment");
    expect(cfg.line_items[0].price_data.recurring).toBeUndefined();
    expect(cfg.line_items[0].price_data.unit_amount).toBe(199500);
    expect(cfg.metadata).toMatchObject({ presence_tier: "founder_120m", presence_ia_months: "120", entry_tax_contract: "qc-exclusive-founder120-v1", guaranteed_appointments: "0" });
    const s = qa.sessions[0] as any;
    expect([s.amount_subtotal, s.total_details.amount_tax, s.amount_total]).toEqual([199500, 29875, 229375]);
    expect((await qa.deliver(s)).status).toBe(200);
    expect((await qa.deliver(s)).status).toBe(200); // relivraison Stripe
    const rows = await ledger();
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata).toMatchObject({ presence_tier: "founder_120m", presence_months: "120", amount_subtotal_cents: 199500 });
    const months = (Date.parse(rows[0].after_state.presence_ia_until) - Date.now()) / (30.44 * 86400000);
    expect(months).toBeGreaterThan(119); expect(months).toBeLessThan(121);
  });
  it("offre Lancement inchangée : 350 $, 12 mois", async () => {
    const r = await qa.checkout("personal", { entryActivation: true, declaredCompanyName: "Atelier synthétique" }, qa.ownerToken);
    expect(r.status).toBe(200);
    const s = qa.sessions[0] as any;
    expect([s.amount_subtotal, s.amount_total]).toEqual([35000, 40241]);
    expect((await qa.deliver(s)).status).toBe(200);
    const rows = await ledger();
    expect(rows[0].metadata).toMatchObject({ presence_tier: "launch_12m", presence_months: "12" });
  });
  it("paiement non réglé : aucun droit", async () => {
    qa.env.PRESENCE_FOUNDER_LIVE_RELEASED = "true";
    await qa.checkout("personal", founderBody, qa.ownerToken);
    const s = qa.sessions[0] as any;
    expect((await qa.deliver(s, { object: { ...s, status: "complete", payment_status: "unpaid" } })).status).toBe(200);
    expect(await ledger()).toHaveLength(0);
  });
});
