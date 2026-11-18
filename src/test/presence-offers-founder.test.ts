import { describe, it, expect } from "vitest";
import { PRESENCE_OFFERS, resolvePresenceTier, presenceTierFromSession, presenceMonthsFromLedger } from "../../supabase/functions/_shared/presenceOffers";
import { entry350PaymentBlockReason, entryActivationReplayReceiptMatches } from "../../supabase/functions/_shared/checkoutGuards";

const founderSession = (over: Record<string, unknown> = {}) => ({
  payment_status: "paid", mode: "payment", currency: "cad", amount_subtotal: 199500, amount_total: 229375,
  total_details: { amount_tax: 29875, amount_discount: 0 },
  metadata: { offer: "entry_activation_350", entry_tax_contract: "qc-exclusive-founder120-v1", presence_tier: "founder_120m", presence_ia_months: "120" },
  ...over,
});

describe("Présence IA — Lancement 350 / Fondateur 1995 (synthétique)", () => {
  it("montants et taxes serveur au cent", () => {
    const l = PRESENCE_OFFERS.launch_12m, f = PRESENCE_OFFERS.founder_120m;
    expect([l.subtotal, l.gst, l.qst, l.total, l.months]).toEqual([35000, 1750, 3491, 40241, 12]);
    expect([f.subtotal, f.gst, f.qst, f.total, f.months]).toEqual([199500, 9975, 19900, 229375, 120]);
    expect(f.gst).toBe(Math.round(f.subtotal * 0.05));
    expect(f.qst).toBe(Math.round(f.subtotal * 0.09975));
  });
  it("le client ne choisit qu'un identifiant connu; défaut = Lancement", () => {
    expect(resolvePresenceTier(undefined)).toBe("launch_12m");
    expect(resolvePresenceTier("founder_120m")).toBe("founder_120m");
    expect(resolvePresenceTier("founder_free")).toBeNull();
    expect(resolvePresenceTier(199500)).toBeNull();
  });
  it("session Fondateur payée et concordante = acceptée, 120 mois", () => {
    expect(entry350PaymentBlockReason(founderSession() as never)).toBeNull();
    expect(presenceTierFromSession(founderSession() as never)).toBe("founder_120m");
  });
  it("Fondateur sous-payé, rabais, mauvais palier ou impayé = refusé", () => {
    expect(entry350PaymentBlockReason(founderSession({ amount_subtotal: 35000, amount_total: 40241 }) as never)).toBe("ignored_amount_mismatch");
    expect(entry350PaymentBlockReason(founderSession({ total_details: { amount_tax: 29875, amount_discount: 100 } }) as never)).toBe("ignored_amount_mismatch");
    expect(entry350PaymentBlockReason(founderSession({ metadata: { ...founderSession().metadata, presence_ia_months: "12" } }) as never)).toBe("ignored_amount_mismatch");
    expect(entry350PaymentBlockReason(founderSession({ payment_status: "unpaid" }) as never)).toBe("ignored_unpaid");
    // 350 $ déclaré Fondateur, ou 1995 sans contrat : jamais 120 mois.
    expect(presenceTierFromSession({ amount_subtotal: 35000, metadata: { presence_tier: "founder_120m", entry_tax_contract: "qc-exclusive-founder120-v1", presence_ia_months: "120" } })).toBeNull();
    expect(presenceTierFromSession({ amount_subtotal: 199500, metadata: { entry_tax_contract: "qc-exclusive-v1" } })).toBeNull();
  });
  it("anciens droits 350 inchangés : 12 mois", () => {
    expect(presenceTierFromSession({ amount_subtotal: 35000, metadata: { entry_tax_contract: "qc-exclusive-v1" } })).toBe("launch_12m");
    expect(presenceMonthsFromLedger({ stripe_session_id: "cs_old" })).toBe(12);
    expect(presenceMonthsFromLedger({ presence_tier: "founder_120m" })).toBe(12);
    expect(presenceMonthsFromLedger({ presence_tier: "founder_120m", presence_months: "120" })).toBe(120);
  });
  it("rejeu webhook idempotent : reçu Fondateur exige son montant", () => {
    const prior = { contractor_id: "c1", source: "stripe_webhook", metadata: { stripe_session_id: "cs_1", stripe_payment_intent: "pi_1", livemode: false, amount_subtotal_cents: 199500 } };
    const exp = { contractorId: "c1", sessionId: "cs_1", paymentIntentId: "pi_1", livemode: false };
    expect(entryActivationReplayReceiptMatches(prior, { ...exp, subtotalCents: 199500 })).toBe(true);
    expect(entryActivationReplayReceiptMatches(prior, exp)).toBe(false);
  });
});
