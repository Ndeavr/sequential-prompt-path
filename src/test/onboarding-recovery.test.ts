/**
 * Reprise d'onboarding incomplet — logique pure (aucun envoi, aucun réseau).
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_RECOVERY_CONFIG,
  mergeConfig,
  normalizeCity,
  normalizeCategory,
  evaluateCandidate,
  matchAffiliate,
  computeLearnedBoosts,
  type LeadRow,
  type AffiliateRow,
} from "../../supabase/functions/affiliate-onboarding-recovery/logic";

const cfg = DEFAULT_RECOVERY_CONFIG;
const NOW = new Date("2026-09-20T12:00:00Z").getTime();

function lead(overrides: Partial<LeadRow> = {}): LeadRow {
  return {
    id: "lead-1",
    company_name: "Couvreurs Test Inc.",
    city: "Verdun",
    category_primary: "Toiture",
    trade: null,
    fit_score: 94,
    priority_score: 60,
    profile_status: "missing",
    onboarding_started_at: "2026-06-14T10:00:00Z",
    payment_started_at: null,
    paid_at: null,
    profile_active_at: null,
    updated_at: "2026-07-21T10:00:00Z",
    archived_at: null,
    do_not_contact: false,
    unsubscribed_at: null,
    compliance_review_required: false,
    assigned_affiliate_id: null,
    phone_e164: "+15145550000",
    phone: null,
    email: null,
    ...overrides,
  };
}

function affiliate(overrides: Partial<AffiliateRow> = {}): AffiliateRow {
  return {
    id: "aff-1",
    first_name: "Lorraine",
    last_name: "Jasmin",
    name: "Lorraine Jasmin",
    status: "active",
    suspended_at: null,
    archived_at: null,
    primary_city: "Montréal",
    territories: ["Montréal", "Laval"],
    allowed_categories: ["toiture", "plomberie"],
    daily_quota: 10,
    ...overrides,
  };
}

describe("normalisation", () => {
  it("mappe un arrondissement de Montréal de façon déterministe", () => {
    const r = normalizeCity("Verdun", cfg);
    expect(r.normalized).toBe("montreal");
    expect(r.mapped).toBe(true);
  });
  it("retire les accents et la casse sans mapping caché", () => {
    expect(normalizeCity("Montréal", cfg).normalized).toBe("montreal");
    expect(normalizeCity("Trois-Rivières", cfg).mapped).toBe(false);
  });
  it("normalise les libellés de catégorie courants", () => {
    expect(normalizeCategory("Couvreurs", cfg)).toBe("toiture");
    expect(normalizeCategory("Toiture", cfg)).toBe("toiture");
  });
});

describe("évaluation des candidats", () => {
  it("accepte un onboarding incomplet inactif et intéressant", () => {
    const e = evaluateCandidate(lead(), cfg, NOW);
    expect(e.eligible).toBe(true);
    expect(e.interesting_reasons).toContain("fit_score>=70");
    expect(e.evidence.rule_version).toBe("v1");
  });

  it.each([
    ["profile_complete", { profile_status: "complete" }],
    ["already_paid", { paid_at: "2026-07-01T00:00:00Z" }],
    ["profile_active", { profile_active_at: "2026-07-01T00:00:00Z" }],
    ["archived", { archived_at: "2026-07-01T00:00:00Z" }],
    ["do_not_contact", { do_not_contact: true }],
    ["unsubscribed", { unsubscribed_at: "2026-07-01T00:00:00Z" }],
    ["compliance_review_required", { compliance_review_required: true }],
    ["no_contact_method", { phone_e164: null, phone: null, email: null }],
    ["already_owned", { assigned_affiliate_id: "aff-9" }],
    ["onboarding_not_started", { onboarding_started_at: null }],
  ])("écarte pour %s", (reason, patch) => {
    const e = evaluateCandidate(lead(patch as Partial<LeadRow>), cfg, NOW);
    expect(e.eligible).toBe(false);
    expect(e.skip_reasons).toContain(reason);
  });

  it("respecte la fenêtre d'inactivité configurée", () => {
    const recent = lead({ updated_at: new Date(NOW - 3600000).toISOString() });
    expect(evaluateCandidate(recent, cfg, NOW).skip_reasons).toContain("still_active_within_window");
  });

  it("écarte un lead déjà routé (idempotence)", () => {
    const e = evaluateCandidate(lead(), cfg, NOW, { alreadyRoutedLeadIds: new Set(["lead-1"]) });
    expect(e.skip_reasons).toContain("already_routed");
  });

  it("écarte un lead sans signal d'intérêt", () => {
    const e = evaluateCandidate(lead({ fit_score: 10, priority_score: 10 }), cfg, NOW);
    expect(e.skip_reasons).toContain("not_interesting");
  });
});

describe("appariement affilié", () => {
  it("route vers un affilié dont la catégorie et le territoire couvrent le lead", () => {
    const m = matchAffiliate(lead(), cfg, [affiliate()], {});
    expect(m.affiliate_id).toBe("aff-1");
    expect(m.reasons.join(" ")).toContain("territory_match:verdun->montreal");
  });

  it("refuse une configuration vide (jamais illimitée)", () => {
    const m = matchAffiliate(lead(), cfg, [affiliate({ allowed_categories: [], territories: [], primary_city: null })], {});
    expect(m.affiliate_id).toBeNull();
    expect(m.rejected[0].reason).toBe("no_category_configured");
  });

  it("refuse les affiliés suspendus, archivés ou inactifs", () => {
    expect(matchAffiliate(lead(), cfg, [affiliate({ suspended_at: "2026-01-01" })], {}).affiliate_id).toBeNull();
    expect(matchAffiliate(lead(), cfg, [affiliate({ archived_at: "2026-01-01" })], {}).affiliate_id).toBeNull();
    expect(matchAffiliate(lead(), cfg, [affiliate({ status: "paused" })], {}).affiliate_id).toBeNull();
  });

  it("refuse une catégorie ou un territoire non couvert", () => {
    expect(matchAffiliate(lead({ category_primary: "Excavation" }), cfg, [affiliate()], {}).affiliate_id).toBeNull();
    expect(matchAffiliate(lead({ city: "Québec" }), cfg, [affiliate()], {}).affiliate_id).toBeNull();
  });

  it("départage par charge du jour et respecte le quota", () => {
    const a = affiliate({ id: "aff-a" });
    const b = affiliate({ id: "aff-b" });
    expect(matchAffiliate(lead(), cfg, [a, b], { "aff-a": 5, "aff-b": 1 }).affiliate_id).toBe("aff-b");
    expect(matchAffiliate(lead(), cfg, [affiliate({ daily_quota: 2 })], { "aff-1": 2 }).affiliate_id).toBeNull();
  });
});

describe("apprentissage borné", () => {
  it("n'applique aucun ajustement sous l'échantillon minimal", () => {
    const r = computeLearnedBoosts({ "aff-1": { attempts: 5, delivered: 2, clicked: 1, signups: 0, activations: 1, conversions: 0 } }, cfg);
    expect(r.applied).toBe(false);
    expect(r.boosts).toEqual({});
  });

  it("plafonne le boost appris à la valeur configurée", () => {
    const rollups = {
      "aff-a": { attempts: 40, delivered: 30, clicked: 20, signups: 15, activations: 15, conversions: 10 },
      "aff-b": { attempts: 40, delivered: 5, clicked: 2, signups: 0, activations: 0, conversions: 0 },
    };
    const r = computeLearnedBoosts(rollups, cfg);
    expect(r.applied).toBe(true);
    expect(Math.abs(r.boosts["aff-a"])).toBeLessThanOrEqual(cfg.learning.max_boost);
    expect(Math.abs(r.boosts["aff-b"])).toBeLessThanOrEqual(cfg.learning.max_boost);
    expect(r.boosts["aff-a"]).toBeGreaterThan(r.boosts["aff-b"]);
  });

  it("permet de reconfigurer les seuils sans changer le code", () => {
    const custom = mergeConfig({ inactivity_hours: 72, learning: { min_sample: 5 } });
    expect(custom.inactivity_hours).toBe(72);
    expect(custom.learning.min_sample).toBe(5);
    expect(custom.learning.max_boost).toBe(10);
  });
});
