// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { entry350CommissionArgs, normalizeAffiliateRef, addCalendarMonths } from "../../supabase/functions/_shared/checkoutGuards";

const AFF = "11111111-2222-3333-4444-555555555555";
const s = (over: Record<string, unknown> = {}, md: Record<string, unknown> = {}) => ({
  id: "cs_live_fixture", payment_status: "paid", amount_subtotal: 35000,
  metadata: { offer: "entry_activation_350", ref: "LORRAINE-UNPRO", affiliate_id: AFF, ...md }, ...over,
});
const args = (session: any, livemode: boolean | null = true, decision = "activate") =>
  entry350CommissionArgs({ livemode, decision, session, contractorId: "c1" });

describe("350 $ — commission affiliée", () => {
  it("LIVE payé avec affiliée résolue : 35000 avant taxes, idempotent par session", () => {
    const a = args(s())!;
    expect(a.p_amount_pretax_cents).toBe(35000);
    expect(a.p_stripe_session_id).toBe("cs_live_fixture");
    expect(a.p_affiliate_id).toBe(AFF);
    expect(a.p_referral_code).toBe("LORRAINE-UNPRO");
    expect(args(s(), true, "already_processed")).not.toBeNull(); // relivraison = même session, RPC idempotente
  });
  it("événement TEST ou livemode inconnu : aucune commission", () => {
    expect(args(s(), false)).toBeNull();
    expect(args(s(), null)).toBeNull();
  });
  it("doublon, TEST bloqué, non payé ou montant faux : aucune commission", () => {
    expect(args(s(), true, "duplicate_payment")).toBeNull();
    expect(args(s(), true, "test_on_non_qa")).toBeNull();
    expect(args(s({ payment_status: "unpaid" }))).toBeNull();
    expect(args(s({ amount_subtotal: 34999 }))).toBeNull();
  });
  it("sans ref, ref malformé ou sans affiliate_id serveur : aucune commission", () => {
    expect(args(s({}, { ref: undefined, affiliate_id: undefined }))).toBeNull();
    expect(args(s({}, { ref: "x; drop" }))).toBeNull();
    expect(args(s({}, { affiliate_id: undefined }))).toBeNull();
    expect(args(s({}, { affiliate_id: "spoof" }))).toBeNull();
  });
  it("normalisation du code", () => {
    expect(normalizeAffiliateRef(" lorraine-unpro ")).toBe("LORRAINE-UNPRO");
    expect(normalizeAffiliateRef("a")).toBeNull();
    expect(normalizeAffiliateRef(42)).toBeNull();
  });
});

describe("350 $ — 12 mois calendaires", () => {
  it("dates", () => {
    expect(addCalendarMonths(new Date("2026-10-21T12:00:00Z"), 12).toISOString()).toBe("2027-10-21T12:00:00.000Z");
    expect(addCalendarMonths(new Date("2028-02-29T00:00:00Z"), 12).toISOString()).toBe("2029-02-28T00:00:00.000Z");
    expect(addCalendarMonths(new Date("2027-01-31T00:00:00Z"), 1).toISOString()).toBe("2027-02-28T00:00:00.000Z");
  });
});

describe("câblage", () => {
  const co = readFileSync("supabase/functions/create-checkout-session/index.ts", "utf8");
  const wh = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
  it("checkout : ref résolu contre une affiliée active, jamais l'id client", () => {
    const i = co.indexOf("entryRefNorm");
    expect(co.slice(i, i + 600)).toMatch(/\.eq\("status", "active"\)/);
    expect(co).toContain("entryAffId ? { ref: entryAffRef, affiliate_id: entryAffId } : {}");
  });
  it("webhook : RPC appelée via entry350CommissionArgs dans la branche 350, durée calendaire", () => {
    const i = wh.indexOf('if (session.metadata?.offer === "entry_activation_350")');
    const branch = wh.slice(i, i + 16000);
    expect(branch).toContain("entry350CommissionArgs(");
    expect(branch).toContain('rpc("record_affiliate_payment_conversion", commissionArgs)');
    expect(branch).toContain("addCalendarMonths(new Date(), 12)");
    expect(branch).not.toContain("365 * 24 * 3600");
  });
});
