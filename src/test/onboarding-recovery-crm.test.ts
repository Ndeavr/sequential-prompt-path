/**
 * Cohorte CRM vérifiée — portes dures, idempotence, ordonnancement.
 * Aucun accès réseau, aucune donnée inventée.
 */
import { describe, it, expect } from "vitest";
import { mergeConfig, matchAffiliateFor, type AffiliateRow } from "../../supabase/functions/affiliate-onboarding-recovery/logic";
import {
  evaluateCrmCandidate,
  crmIdempotencyKey,
  crmRoutingScore,
  type CrmQueueRow,
} from "../../supabase/functions/affiliate-onboarding-recovery/crm";

const cfg = mergeConfig({});

const row = (o: Partial<CrmQueueRow> = {}): CrmQueueRow => ({
  prospect_id: "p1",
  business_name: "Toiture Test",
  city: "Montréal",
  category: "Toiture",
  current_stage: "checkout_opened",
  priority_score: 80,
  phone_e164: "+15145550000",
  email: null,
  opted_out: false,
  assignment_id: null,
  affiliate_id: null,
  ...o,
});

const affiliate = (o: Partial<AffiliateRow> = {}): AffiliateRow => ({
  id: "a1",
  first_name: "Lorraine",
  last_name: "Jasmin",
  name: "Lorraine Jasmin",
  status: "active",
  suspended_at: null,
  archived_at: null,
  primary_city: "Montréal",
  territories: ["Montréal", "Laval"],
  allowed_categories: ["Toiture"],
  daily_quota: 10,
  ...o,
});

describe("evaluateCrmCandidate", () => {
  it("accepte une étape admissible avec coordonnée et sans assignation", () => {
    const e = evaluateCrmCandidate(row(), cfg);
    expect(e.eligible).toBe(true);
    expect(e.interesting_reasons).toContain("stage:checkout_opened");
  });

  it("refuse un dossier déjà assigné", () => {
    expect(evaluateCrmCandidate(row({ assignment_id: "x" }), cfg).skip_reasons).toContain("already_assigned");
    expect(evaluateCrmCandidate(row({ affiliate_id: "a1" }), cfg).skip_reasons).toContain("already_assigned");
  });

  it("refuse un retrait de consentement", () => {
    expect(evaluateCrmCandidate(row({ opted_out: true }), cfg).skip_reasons).toContain("opted_out");
  });

  it("refuse l'absence totale de coordonnée", () => {
    const e = evaluateCrmCandidate(row({ phone_e164: null, email: null }), cfg);
    expect(e.skip_reasons).toContain("no_contact_method");
  });

  it("marque les étapes observées mais non routées en v1", () => {
    const e = evaluateCrmCandidate(row({ current_stage: "landing_viewed" }), cfg);
    expect(e.eligible).toBe(false);
    expect(e.future_eligible).toBe(true);
    expect(e.skip_reasons).toContain("stage_future_eligible");
  });

  it("écarte une étape inconnue sans la promettre pour plus tard", () => {
    const e = evaluateCrmCandidate(row({ current_stage: "paid" }), cfg);
    expect(e.future_eligible).toBe(false);
    expect(e.skip_reasons).toContain("stage_not_eligible");
  });

  it("est idempotent via la liste des dossiers déjà routés", () => {
    const e = evaluateCrmCandidate(row(), cfg, { alreadyRoutedProspectIds: new Set(["p1"]) });
    expect(e.skip_reasons).toContain("already_routed");
  });

  it("normalise la ville et la catégorie dans la preuve", () => {
    const e = evaluateCrmCandidate(row({ city: "Verdun", category: "Couvreur" }), cfg);
    expect(e.evidence.city_normalized).toBe("montreal");
    expect(e.evidence.category_normalized).toBe("toiture");
  });
});

describe("crmIdempotencyKey", () => {
  it("est déterministe et versionnée", () => {
    expect(crmIdempotencyKey("p1", "checkout_opened", "v1")).toBe("auto_recovery:p1:checkout_opened:v1");
    expect(crmIdempotencyKey("p1", "checkout_opened", "v2")).not.toBe(crmIdempotencyKey("p1", "checkout_opened", "v1"));
  });
});

describe("crmRoutingScore", () => {
  it("place le paiement entamé devant l'inscription simple", () => {
    expect(crmRoutingScore(row({ current_stage: "checkout_opened" }), cfg))
      .toBeGreaterThan(crmRoutingScore(row({ current_stage: "registered" }), cfg));
  });

  it("borne le boost appris", () => {
    const high = crmRoutingScore(row(), cfg, 9999);
    const base = crmRoutingScore(row(), cfg, 0);
    expect(high - base).toBe(cfg.learning.max_boost);
  });
});

describe("matchAffiliateFor — cohorte CRM", () => {
  it("apparie via la normalisation géographique documentée", () => {
    const m = matchAffiliateFor("Verdun", "Toiture", cfg, [affiliate()], {});
    expect(m.affiliate_id).toBe("a1");
    expect(m.reasons.join(" ")).toContain("verdun->montreal");
  });

  it("refuse une configuration d'affilié vide", () => {
    const m = matchAffiliateFor("Montréal", "Toiture", cfg, [affiliate({ allowed_categories: [], territories: [], primary_city: null })], {});
    expect(m.affiliate_id).toBeNull();
    expect(m.rejected[0].reason).toBe("no_category_configured");
  });

  it("refuse une catégorie hors configuration", () => {
    const m = matchAffiliateFor("Montréal", "Plomberie", cfg, [affiliate()], {});
    expect(m.affiliate_id).toBeNull();
    expect(m.rejected[0].reason).toBe("category_mismatch");
  });

  it("refuse un territoire hors configuration", () => {
    const m = matchAffiliateFor("Québec", "Toiture", cfg, [affiliate()], {});
    expect(m.affiliate_id).toBeNull();
    expect(m.rejected[0].reason).toBe("territory_mismatch");
  });

  it("respecte le quota quotidien", () => {
    const m = matchAffiliateFor("Montréal", "Toiture", cfg, [affiliate()], { a1: 10 });
    expect(m.affiliate_id).toBeNull();
    expect(m.rejected[0].reason).toBe("daily_quota_reached");
  });

  it("départage par charge la plus faible", () => {
    const m = matchAffiliateFor("Montréal", "Toiture", cfg, [affiliate(), affiliate({ id: "a2" })], { a1: 4, a2: 1 });
    expect(m.affiliate_id).toBe("a2");
  });
});
