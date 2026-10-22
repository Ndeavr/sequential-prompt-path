import { describe, it, expect } from "vitest";
import {
  mergeConfig, matchAffiliateFor, applyFallback, checkoutEvidence, isArtificialName, type AffiliateRow,
} from "../../supabase/functions/affiliate-onboarding-recovery/logic";

const LORRAINE = "b060f9ae-49e1-440b-a252-691ec99b86b7";
const YANICK = "ead9ea80-2b94-4d1b-8917-c53e15782135";
const OTHER_EMPTY = "00000000-0000-0000-0000-000000000099";
const aff = (o: Partial<AffiliateRow>): AffiliateRow => ({
  id: "x", first_name: null, last_name: null, name: null, status: "active", suspended_at: null, archived_at: null,
  primary_city: null, territories: [], allowed_categories: [], daily_quota: 25, ...o,
});
const affiliates = [
  aff({ id: LORRAINE, first_name: "Lorraine", primary_city: "Montréal", territories: ["Montréal", "Laval"], allowed_categories: ["toiture", "plomberie", "electricite"], daily_quota: 10 }),
  aff({ id: YANICK, first_name: "Yanick" }),
  aff({ id: OTHER_EMPTY, first_name: "Autre" }),
];
const cfg = mergeConfig({ fallback_affiliate_id: YANICK });
const now = Date.UTC(2026, 9, 22);

describe("routage reprise après outreach", () => {
  it("Lorraine reçoit un dossier compatible (plomberie, Laval)", () => {
    const m = applyFallback(matchAffiliateFor("Laval", "plomberie", cfg, affiliates, {}), cfg, affiliates, {});
    expect(m.affiliate_id).toBe(LORRAINE);
  });
  it("incompatible → Yanick seulement (repli explicite), jamais un autre affilié vide", () => {
    const m = applyFallback(matchAffiliateFor("Longueuil", "isolation", cfg, affiliates, {}), cfg, affiliates, {});
    expect(m.affiliate_id).toBe(YANICK);
    expect(m.reasons).toContain("admin_fallback_review_queue");
  });
  it("sans repli configuré, aucun affilié vide n'est éligible", () => {
    const c = mergeConfig({});
    expect(applyFallback(matchAffiliateFor("Longueuil", "isolation", c, affiliates, {}), c, affiliates, {}).affiliate_id).toBeNull();
  });
  it("repli au quota quotidien → non assigné", () => {
    expect(applyFallback(matchAffiliateFor("Longueuil", "isolation", cfg, affiliates, {}), cfg, affiliates, { [YANICK]: 25 }).affiliate_id).toBeNull();
  });
  it("plafond pilote par défaut = 3 par affilié et par cycle", () => {
    expect(mergeConfig({}).max_new_per_affiliate_per_cycle).toBe(3);
  });
  it("Checkout TEST seul = aucune preuve", () => {
    const r = checkoutEvidence([{ destination_url: "https://checkout.stripe.com/c/pay/cs_test_abc", occurred_at: "2026-08-01T00:00:00Z" }], cfg, now);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no_live_checkout_evidence");
  });
  it("Checkout LIVE de moins de 48 h = trop récent", () => {
    const r = checkoutEvidence([{ destination_url: "https://checkout.stripe.com/c/pay/cs_live_abc", occurred_at: new Date(now - 47 * 3600000).toISOString() }], cfg, now);
    expect(r.reason).toBe("checkout_too_recent");
  });
  it("Checkout LIVE de plus de 48 h = preuve valide", () => {
    expect(checkoutEvidence([{ destination_url: "https://checkout.stripe.com/c/pay/cs_live_abc", occurred_at: "2026-08-05T10:00:00Z" }], cfg, now).ok).toBe(true);
  });
  it("dossiers QA / démo exclus, vraies entreprises gardées", () => {
    expect(isArtificialName("QA GOLDEN PATH — NE PAS CONTACTER", cfg)).toBe(true);
    expect(isArtificialName("RD Reno Demo", cfg)).toBe(true);
    expect(isArtificialName("Noble Quebec Laval", cfg)).toBe(false);
    expect(isArtificialName("Isolation JTL Inc.", cfg)).toBe(false);
  });
});
